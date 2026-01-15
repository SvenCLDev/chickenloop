import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Job from '@/models/Job';
import { requireRole } from '@/lib/auth';

// POST - Toggle favourite status for a job (job seekers only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireRole(request, ['job-seeker']);
    await connectDB();
    const { id } = await params;

    // Verify job exists
    const job = await Job.findById(id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get user with favourites
    const userData = await User.findById(user.userId);
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Initialize favouriteJobs if it doesn't exist
    if (!userData.favouriteJobs) {
      userData.favouriteJobs = [];
    }

    const jobId = job._id as any;
    const isFavourite = userData.favouriteJobs.some(
      (favId: any) => favId.toString() === jobId.toString()
    );

    if (isFavourite) {
      // Remove from favourites
      userData.favouriteJobs = userData.favouriteJobs.filter(
        (favId: any) => favId.toString() !== jobId.toString()
      );
    } else {
      // Add to favourites
      userData.favouriteJobs.push(jobId);
    }

    await userData.save();

    return NextResponse.json(
      {
        message: isFavourite ? 'Removed from favourites' : 'Added to favourites',
        isFavourite: !isFavourite,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Check if job is in favourites (job seekers only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireRole(request, ['job-seeker']);
    await connectDB();
    const { id } = await params;

    const userData = await User.findById(user.userId);
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Initialize favouriteJobs if it doesn't exist
    if (!userData.favouriteJobs) {
      userData.favouriteJobs = [];
    }

    const isFavourite = userData.favouriteJobs.some(
      (favId: any) => favId.toString() === id
    );

    return NextResponse.json({ isFavourite }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}











