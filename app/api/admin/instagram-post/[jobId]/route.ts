import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import { requireRole } from '@/lib/auth';
import { postJobToInstagram } from '@/lib/social/instagram';

/**
 * POST /api/admin/instagram-post/[jobId]
 * Post a job to Instagram (admin only). Re-posts are allowed; prior posts are kept in
 * instagramPostHistory and instagramPostId always points at the latest media.
 * Body (optional): { pos?: string; bg?: string; customTags?: string; collaborator?: string }
 * — layout options, extra hashtags/mentions, and an Instagram handle to collab-tag
 * (defaults to the company's own Instagram profile when not provided).
 * Returns { success, postId, postedAt, postCount, jobId } on success.
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
      .populate('companyId', 'name logo socialMedia')
      .lean();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const company = job.companyId as {
      name?: string;
      logo?: string;
      socialMedia?: Record<string, string>;
    } | null;
    const jobForInstagram = {
      ...job,
      company: company
        ? { name: company.name, logo: company.logo, socialMedia: company.socialMedia }
        : undefined,
    };

    const body: {
      pos?: string;
      bg?: string;
      customTags?: string;
      collaborator?: string;
    } = {};
    try {
      const raw = await request.json();
      if (raw && typeof raw === 'object') {
        if (typeof raw.pos === 'string') body.pos = raw.pos;
        if (typeof raw.bg === 'string') body.bg = raw.bg;
        if (typeof raw.customTags === 'string') body.customTags = raw.customTags;
        if (typeof raw.collaborator === 'string') body.collaborator = raw.collaborator;
      }
    } catch {
      // no body or invalid JSON – use defaults
    }

    const result = await postJobToInstagram(jobForInstagram, body);

    return NextResponse.json(
      {
        success: true,
        postId: result.postId,
        postedAt: result.postedAt,
        postCount: result.postCount,
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
    if (
      message === 'Job must have an image: set job.pictures[0] or job.company.logo'
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message === 'Missing Instagram environment variables.') {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    if (message.includes('BLOB_READ_WRITE_TOKEN')) {
      return NextResponse.json({ error: message }, { status: 503 });
    }

    console.error('[admin/instagram-post]', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
