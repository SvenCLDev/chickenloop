import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import User from '@/models/User';
import { buildJobFollowUpUrls, sendJobFollowUp } from '@/lib/email/sendJobFollowUp';
import { verifyCronRequest } from '@/lib/cronAuth';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface RecruiterJobSummary {
  _id: mongoose.Types.ObjectId;
  activeJobsCount: number;
  latestJobCreatedAt: Date;
}

interface EligibleRecruiter {
  recruiterId: string;
  email: string;
  name?: string;
  companyId?: string;
  activeJobsCount: number;
}

/**
 * Vercel Cron: recruiter follow-up emails (one per eligible recruiter).
 * Schedule: daily at 08:00 UTC (vercel.json).
 */
export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);
    const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS);

    const activeJobsCount = await Job.countDocuments({ status: 'published' });

    const recruiterSummaries = (await Job.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: '$recruiter',
          activeJobsCount: { $sum: 1 },
          latestJobCreatedAt: { $max: '$createdAt' },
        },
      },
    ])) as RecruiterJobSummary[];

    const recruitersFoundCount = recruiterSummaries.length;
    const eligibleRecruiters: EligibleRecruiter[] = [];

    for (const summary of recruiterSummaries) {
      const recruiterId = summary._id;
      const recruiterUser = await User.findById(recruiterId)
        .select('email name role companyId lastRecruiterFollowUpEmailAt')
        .lean();

      if (!isEligibleRecruiter(summary, recruiterUser, sevenDaysAgo, thirtyDaysAgo)) {
        continue;
      }

      eligibleRecruiters.push({
        recruiterId: recruiterId.toString(),
        email: recruiterUser!.email!.trim(),
        name: recruiterUser?.name ?? undefined,
        companyId: recruiterUser?.companyId ? String(recruiterUser.companyId) : undefined,
        activeJobsCount: summary.activeJobsCount,
      });
    }

    const eligibleRecruitersCount = eligibleRecruiters.length;
    let emailsSentCount = 0;

    for (const recruiter of eligibleRecruiters) {
      const { dashboardUrl, companyProfileUrl } = buildJobFollowUpUrls(recruiter.companyId);

      const result = await sendJobFollowUp({
        recruiterEmail: recruiter.email,
        recruiterName: recruiter.name,
        recruiterUserId: recruiter.recruiterId,
        activeJobsCount: recruiter.activeJobsCount,
        dashboardUrl,
        companyProfileUrl,
      });

      if (!result.success) {
        console.error(
          `[Cron Job Follow-up] Failed to send to ${recruiter.email}:`,
          result.error ?? 'unknown error'
        );
        continue;
      }

      await User.updateOne(
        {
          _id: recruiter.recruiterId,
          $or: [
            { lastRecruiterFollowUpEmailAt: null },
            { lastRecruiterFollowUpEmailAt: { $lt: thirtyDaysAgo } },
          ],
        },
        {
          $set: {
            recruiterFollowUpEmailSent: true,
            lastRecruiterFollowUpEmailAt: now,
          },
        }
      );

      emailsSentCount++;
    }

    return NextResponse.json(
      {
        activeJobsCount,
        recruitersFoundCount,
        eligibleRecruitersCount,
        emailsSentCount,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron Job Follow-up] Fatal error:', errorMessage);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

function isEligibleRecruiter(
  summary: RecruiterJobSummary,
  recruiterUser: {
    email?: string;
    role?: string | null;
    lastRecruiterFollowUpEmailAt?: Date | null;
  } | null,
  sevenDaysAgo: Date,
  thirtyDaysAgo: Date
): boolean {
  if (summary.activeJobsCount <= 0) {
    return false;
  }

  const latestCreated = new Date(summary.latestJobCreatedAt);
  if (latestCreated > sevenDaysAgo || latestCreated < thirtyDaysAgo) {
    return false;
  }

  if (!recruiterUser || recruiterUser.role !== 'recruiter' || !recruiterUser.email?.trim()) {
    return false;
  }

  if (
    recruiterUser.lastRecruiterFollowUpEmailAt &&
    recruiterUser.lastRecruiterFollowUpEmailAt >= thirtyDaysAgo
  ) {
    return false;
  }

  return true;
}
