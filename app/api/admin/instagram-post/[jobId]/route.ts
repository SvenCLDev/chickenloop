import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import { requireRole } from '@/lib/auth';
import { postJobToInstagram } from '@/lib/social/instagram';

/**
 * POST /api/admin/instagram-post/[jobId]
 * Post a job to Instagram (admin only).
 * Body (optional): { pos?: string; bg?: string; customTags?: string } — layout options and extra hashtags/mentions.
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
      .populate('companyId', 'name logo')
      .lean();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.instagramPostId) {
      return NextResponse.json(
        { error: 'Job already posted to Instagram.' },
        { status: 400 }
      );
    }

    const company = job.companyId as { name?: string; logo?: string } | null;
    const jobForInstagram = {
      ...job,
      company: company
        ? { name: company.name, logo: company.logo }
        : undefined,
    };

    let body: { pos?: string; bg?: string; customTags?: string } = {};
    try {
      const raw = await request.json();
      if (raw && typeof raw === 'object') {
        if (typeof raw.pos === 'string') body.pos = raw.pos;
        if (typeof raw.bg === 'string') body.bg = raw.bg;
        if (typeof raw.customTags === 'string') body.customTags = raw.customTags;
      }
    } catch {
      // no body or invalid JSON – use defaults
    }

    const postId = await postJobToInstagram(jobForInstagram, body);

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
    if (message === 'Job already posted to Instagram.') {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }
    if (
      message === 'Job must have an image: set job.pictures[0] or job.company.logo'
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message === 'Missing Instagram environment variables.') {
      return NextResponse.json({ error: message }, { status: 503 });
    }

    console.error('[admin/instagram-post]', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
