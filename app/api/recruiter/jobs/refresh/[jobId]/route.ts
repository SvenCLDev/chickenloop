import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import { requireRole } from '@/lib/auth';
import {
  canRefreshJob,
  getJobRefreshCooldownMessage,
  getJobRefreshDaysRemaining,
} from '@/lib/jobRefresh';
import { revalidateJobPages } from '@/lib/revalidateJobs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await requireRole(request, ['recruiter']);
    await connectDB();

    const { jobId } = await params;
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return NextResponse.json({ error: 'Invalid job id' }, { status: 400 });
    }

    const job = await Job.findOne({
      _id: new mongoose.Types.ObjectId(jobId),
      recruiter: new mongoose.Types.ObjectId(user.userId),
    }).select('_id title country lastRefreshedAt');

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (!canRefreshJob(job.lastRefreshedAt)) {
      const daysRemaining = getJobRefreshDaysRemaining(job.lastRefreshedAt);
      return NextResponse.json(
        {
          error: getJobRefreshCooldownMessage(daysRemaining),
          daysRemaining,
        },
        { status: 429 }
      );
    }

    const now = new Date();
    const refreshed = await Job.findOneAndUpdate(
      {
        _id: job._id,
        recruiter: new mongoose.Types.ObjectId(user.userId),
      },
      {
        $set: {
          updatedAt: now,
          lastRecruiterEditAt: now,
          lastRefreshedAt: now,
        },
      },
      { new: true }
    ).select('_id title country updatedAt lastRecruiterEditAt lastRefreshedAt');

    if (!refreshed) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    revalidateJobPages({ title: refreshed.title, country: refreshed.country ?? null });

    return NextResponse.json(
      {
        success: true,
        updatedAt: refreshed.updatedAt,
        lastRecruiterEditAt: refreshed.lastRecruiterEditAt,
        lastRefreshedAt: refreshed.lastRefreshedAt,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to refresh job' }, { status: 500 });
  }
}
