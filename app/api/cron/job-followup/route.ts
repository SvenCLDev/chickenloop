import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import User from '@/models/User';
import { buildJobFollowUpUrls, sendJobFollowUp } from '@/lib/email/sendJobFollowUp';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type SkipReason =
  | 'No active jobs'
  | 'Job too new'
  | 'Job too old'
  | 'Follow-up already sent'
  | 'Missing email'
  | 'Missing recruiter account';

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
 * Vercel Cron: recruiter follow-up emails (one per recruiter).
 * Schedule: daily at 08:00 UTC (vercel.json).
 *
 * TEST MODE: sends to the first eligible recruiter only (slice(0, 1)).
 */
export async function GET(request: NextRequest) {
  console.log('FOLLOWUP CRON VERSION 3');

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);
    const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS);

    console.log('[Cron Job Follow-up] Starting processing (test mode — first eligible recruiter only)...');

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

      const email = recruiterUser?.email?.trim() || null;
      const reasonSkipped = getSkipReason({
        summary,
        recruiterUser,
        sevenDaysAgo,
        thirtyDaysAgo,
      });

      if (reasonSkipped) {
        console.log('email:', email ?? recruiterId.toString());
        console.log('reasonSkipped:', reasonSkipped);
        continue;
      }

      eligibleRecruiters.push({
        recruiterId: recruiterId.toString(),
        email: email!,
        name: recruiterUser?.name ?? undefined,
        companyId: recruiterUser?.companyId ? String(recruiterUser.companyId) : undefined,
        activeJobsCount: summary.activeJobsCount,
      });
    }

    const eligibleRecruitersCount = eligibleRecruiters.length;
    const testRecruiters = eligibleRecruiters.slice(0, 1);
    let emailsSentCount = 0;

    for (const recruiter of testRecruiters) {
      const { dashboardUrl, companyProfileUrl } = buildJobFollowUpUrls(recruiter.companyId);

      console.log(`[FollowUp] Sending test email to ${recruiter.email}`);

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
          `[Cron Job Follow-up] Failed to send test email to ${recruiter.email}:`,
          result.error ?? 'unknown error'
        );
        continue;
      }

      const updateResult = await User.updateOne(
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

      if (updateResult.modifiedCount === 0) {
        console.warn(
          `[Cron Job Follow-up] Test email sent but user record not updated for ${recruiter.email}`
        );
      }

      emailsSentCount++;
      console.log('Recruiter follow-up sent to:');
      console.log(recruiter.email);
      console.log(recruiter.activeJobsCount);
    }

    console.log('Active jobs:', activeJobsCount);
    console.log('Recruiters found:', recruitersFoundCount);
    console.log('Eligible recruiters:', eligibleRecruitersCount);

    return NextResponse.json(
      {
        version: 3,
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

function getSkipReason({
  summary,
  recruiterUser,
  sevenDaysAgo,
  thirtyDaysAgo,
}: {
  summary: RecruiterJobSummary;
  recruiterUser: {
    email?: string;
    role?: string | null;
    lastRecruiterFollowUpEmailAt?: Date | null;
  } | null;
  sevenDaysAgo: Date;
  thirtyDaysAgo: Date;
}): SkipReason | null {
  if (summary.activeJobsCount <= 0) {
    return 'No active jobs';
  }

  const latestCreated = new Date(summary.latestJobCreatedAt);
  if (latestCreated > sevenDaysAgo) {
    return 'Job too new';
  }

  if (latestCreated < thirtyDaysAgo) {
    return 'Job too old';
  }

  if (!recruiterUser || recruiterUser.role !== 'recruiter') {
    return 'Missing recruiter account';
  }

  if (!recruiterUser.email?.trim()) {
    return 'Missing email';
  }

  if (
    recruiterUser.lastRecruiterFollowUpEmailAt &&
    recruiterUser.lastRecruiterFollowUpEmailAt >= thirtyDaysAgo
  ) {
    return 'Follow-up already sent';
  }

  return null;
}
