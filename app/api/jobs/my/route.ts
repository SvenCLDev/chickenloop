import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import { requireRole } from '@/lib/auth';

// GET - Get all jobs posted by the current recruiter
// Optional query param: ?published=true to get only published jobs
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['recruiter', 'admin']);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const publishedOnly = searchParams.get('published') === 'true';

    const query: any = { recruiter: user.userId };
    if (publishedOnly) {
      query.published = true;
    }

    const jobs = await Job.find(query)
      .populate('recruiter', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json({ jobs }, { status: 200 });
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

