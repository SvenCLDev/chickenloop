import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import { generateJobSlug } from '@/lib/jobSlug';
import { buildInstagramPreview } from '@/lib/social/instagram';
import { buildDefaultCarouselConfig } from '@/lib/instagramSlideConfig';

/**
 * GET /api/instagram-preview/[jobId]
 * Returns preview data for posting the job to Instagram (caption, hashtags, image URL,
 * company Instagram handle, and default carousel slide config).
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
      .populate('companyId', 'name logo socialMedia')
      .lean();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const companyId = job.companyId as {
      name?: string;
      logo?: string;
      socialMedia?: Record<string, string>;
    } | null;
    const jobForPreview = {
      ...job,
      _id: job._id,
      title: job.title,
      city: job.city,
      country: job.country,
      pictures: job.pictures,
      description: job.description,
      type: (job as { type?: string }).type,
      experience: (job as { experience?: string }).experience,
      experienceLevel: (job as { experienceLevel?: string | string[] }).experienceLevel,
      qualifications: (job as { qualifications?: string[] }).qualifications,
      slug: generateJobSlug(job.title ?? ''),
      company: companyId
        ? {
            name: companyId.name,
            logo: companyId.logo,
            socialMedia: companyId.socialMedia,
          }
        : undefined,
    };

    const { imageUrl, caption, hashtags, fullCaption, collaborator } =
      buildInstagramPreview(jobForPreview);

    const slides = buildDefaultCarouselConfig(jobForPreview);

    return NextResponse.json({
      imageUrl,
      caption,
      hashtags,
      fullCaption,
      collaborator,
      slides,
      pictureCount: Array.isArray(job.pictures)
        ? job.pictures.filter((p) => typeof p === 'string' && p).length
        : 0,
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
