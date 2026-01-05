import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';

// POST - Report a job as spam (accessible to all users, including anonymous)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const job = await Job.findById(id);
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Set spam flag to 'yes'
    // Skip validation since we're only updating the spam flag, not job content
    job.spam = 'yes';
    await job.save({ validateBeforeSave: false });
    
    // Verify the save worked
    const updatedJob = await Job.findById(id);
    if ((updatedJob as any)?.spam !== 'yes') {
      console.error('Failed to save spam flag for job:', id);
    }

    return NextResponse.json(
      { message: 'Job reported as spam. Thank you for your report.' },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

