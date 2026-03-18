import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import { requireRole } from '@/lib/auth';
import { postJobToFacebook } from '@/lib/social/facebook';

/**
 * POST /api/admin/facebook-post/[jobId]
 * Post a job to Facebook Page (admin only).
 * Returns { success, postId, jobId } on success.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    await requireRole(request, ['admin']);
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const job = await Job.findById(jobId)
      .populate('companyId', 'name')
      .lean();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.facebookPostId) {
      return NextResponse.json(
        { error: 'Already posted' },
        { status: 400 }
      );
    }

    const company = job.companyId as { name?: string } | null;
    const companyName =
      (company?.name as string | undefined) ||
      (job.companyName as string | undefined) ||
      '';

    const jobForFacebook = {
      title: job.title,
      city: job.city ?? '',
      country: job.country ?? null,
      description: job.description ?? null,
      company: companyName || undefined,
    };

    const data = await postJobToFacebook(jobForFacebook);
    const postId = data?.id;

    if (!postId || typeof postId !== 'string') {
      return NextResponse.json(
        { error: 'Facebook API did not return a post ID' },
        { status: 502 }
      );
    }

    await Job.findByIdAndUpdate(jobId, {
      $set: { facebookPostId: postId },
    });

    return NextResponse.json(
      {
        success: true,
        postId,
        jobId,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (message === 'PASSWORD_RESET_REQUIRED') {
      return NextResponse.json(
        { error: 'PASSWORD_RESET_REQUIRED' },
        { status: 403 }
      );
    }
    if (message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (message === 'Already posted') {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (
      message.includes('FACEBOOK_PAGE_ID') ||
      message.includes('FACEBOOK_PAGE_ACCESS_TOKEN')
    ) {
      return NextResponse.json({ error: message }, { status: 503 });
    }

    console.error('[admin/facebook-post]', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
