import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CV from '@/models/CV';
import { requireRole } from '@/lib/auth';

// POST - Toggle CV published status (job seekers only)
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['job-seeker']);
    await connectDB();

    const cv = await CV.findOne({ jobSeeker: user.userId });

    if (!cv) {
      return NextResponse.json({ error: 'CV not found' }, { status: 404 });
    }

    // Toggle published status
    // If published is true, set to false (hide)
    // If published is false or undefined (default), set to true (show)
    cv.published = cv.published === true ? false : true;
    await cv.save();

    return NextResponse.json(
      { 
        message: cv.published ? 'CV published successfully' : 'CV hidden successfully',
        published: cv.published 
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'PASSWORD_RESET_REQUIRED') {
      return NextResponse.json({ error: 'PASSWORD_RESET_REQUIRED' }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'COMPANY_PROFILE_INCOMPLETE') {
      return NextResponse.json(
        { error: 'COMPANY_PROFILE_INCOMPLETE' },
        { status: 403 }
      );
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

