import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import { generateJobSlug } from '@/lib/jobSlug';
import { buildInstagramPreview } from '@/lib/social/instagram';

/**
 * GET /api/instagram-preview/[jobId]
 * Returns preview data for posting the job to Instagram (caption, hashtags, image URL).
 * Does not call the Instagram API.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
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

    const companyId = job.companyId as { name?: string; logo?: string } | null;
    const jobForPreview = {
      ...job,
      _id: job._id,
      title: job.title,
      city: job.city,
      country: job.country,
      pictures: job.pictures,
      slug: generateJobSlug(job.title ?? ''),
      company: companyId
        ? { name: companyId.name, logo: companyId.logo }
        : undefined,
    };

    const { imageUrl, caption, hashtags, fullCaption } =
      buildInstagramPreview(jobForPreview);

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Job must have an image (pictures[0] or company logo) to preview' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      imageUrl,
      caption,
      hashtags,
      fullCaption,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[instagram-preview]', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
