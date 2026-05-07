import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import { requireRole } from '@/lib/auth';

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

    const now = new Date();
    const refreshed = await Job.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(jobId),
        recruiter: new mongoose.Types.ObjectId(user.userId),
      },
      {
        $set: {
          updatedAt: now,
          lastRecruiterEditAt: now,
        },
      },
      { new: true }
    ).select('_id updatedAt lastRecruiterEditAt');

    if (!refreshed) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        updatedAt: refreshed.updatedAt,
        lastRecruiterEditAt: refreshed.lastRecruiterEditAt,
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
