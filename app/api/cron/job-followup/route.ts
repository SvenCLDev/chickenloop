import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import User from '@/models/User';
import { buildJobFollowUpUrls, sendJobFollowUp } from '@/lib/email/sendJobFollowUp';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface RecruiterJobSummary {
  _id: mongoose.Types.ObjectId;
  activeJobsCount: number;
  latestJobCreatedAt: Date;
}

/**
 * Vercel Cron: send recruiter follow-up emails (one per recruiter).
 * Schedule: daily at 08:00 UTC (vercel.json).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);
    const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS);

    console.log('[Cron Job Follow-up] Starting processing...');

    const recruiterSummaries = (await Job.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: '$recruiter',
          activeJobsCount: { $sum: 1 },
          latestJobCreatedAt: { $max: '$createdAt' },
        },
      },
      {
        $match: {
          latestJobCreatedAt: { $lte: sevenDaysAgo, $gte: thirtyDaysAgo },
        },
      },
    ])) as RecruiterJobSummary[];

    console.log(
      `[Cron Job Follow-up] Found ${recruiterSummaries.length} recruiters in rollout window (7–30 days since latest post)`
    );

    let emailsSent = 0;
    let skipped = 0;
    let errors = 0;

    for (const summary of recruiterSummaries) {
      const recruiterId = summary._id;

      try {
        const recruiter = await User.findOne({
          _id: recruiterId,
          role: 'recruiter',
          email: { $exists: true, $ne: '' },
          $or: [
            { lastRecruiterFollowUpEmailAt: null },
            { lastRecruiterFollowUpEmailAt: { $lt: thirtyDaysAgo } },
          ],
        })
          .select('name email companyId lastRecruiterFollowUpEmailAt')
          .lean();

        if (!recruiter?.email) {
          skipped++;
          continue;
        }

        const companyId = recruiter.companyId ? String(recruiter.companyId) : '';
        const { dashboardUrl, companyProfileUrl } = buildJobFollowUpUrls(companyId);

        const result = await sendJobFollowUp({
          recruiterEmail: recruiter.email,
          recruiterName: recruiter.name ?? undefined,
          recruiterUserId: String(recruiterId),
          activeJobsCount: summary.activeJobsCount,
          dashboardUrl,
          companyProfileUrl,
        });

        if (!result.success) {
          console.error(
            `[Cron Job Follow-up] Failed to send for recruiter ${recruiterId}:`,
            result.error ?? 'unknown error'
          );
          errors++;
          continue;
        }

        const updateResult = await User.updateOne(
          {
            _id: recruiterId,
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
            `[Cron Job Follow-up] Recruiter ${recruiterId} already received follow-up within 30 days`
          );
          skipped++;
          continue;
        }

        emailsSent++;
        console.log('Recruiter follow-up sent to:');
        console.log(recruiter.email);
        console.log(summary.activeJobsCount);
      } catch (recruiterError: unknown) {
        errors++;
        const message = recruiterError instanceof Error ? recruiterError.message : 'Unknown error';
        console.error(`[Cron Job Follow-up] Error processing recruiter ${recruiterId}:`, message);
      }
    }

    const summary = {
      message: 'Recruiter follow-up emails processed',
      eligibleRecruiters: recruiterSummaries.length,
      emailsSent,
      skipped,
      errors,
      timestamp: now.toISOString(),
    };

    console.log('[Cron Job Follow-up] Processing complete:', summary);

    return NextResponse.json(summary, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron Job Follow-up] Fatal error:', errorMessage);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}
