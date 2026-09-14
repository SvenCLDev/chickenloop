import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import {
  generateInstagramImageBuffer,
  generateInstagramImagePngBuffer,
  generateInstagramSlideBuffer,
  generateInstagramSlidePngBuffer,
  type InstagramImageJob,
  type Pos,
  type Bg,
  POS_VALUES,
  BG_VALUES,
} from '@/lib/instagram-image';
import {
  buildDefaultCarouselConfig,
  normalizeSlideConfig,
  parseSlideConfigFromSearchParams,
} from '@/lib/instagramSlideConfig';

// Node.js required: Mongoose and sharp do not support Edge runtime
export const runtime = 'nodejs';

/**
 * GET /api/instagram-image/[jobId] or /api/instagram-image/[jobId].png
 * Generates a 1080x1350 image. Supports both URL forms; .png path returns PNG, otherwise JPEG.
 * Optional `slide=0|1|2` (+ layout/text query params) renders a carousel slide preview.
 * Does not call the Instagram API.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId: rawParam } = await params;
    const rawId = rawParam ?? '';

    // Remove optional .png suffix
    const jobId = rawId.replace('.png', '');

    if (!jobId) {
      return new Response('Job ID is required', { status: 400 });
    }

    // Validate Mongo ObjectId
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return new Response('Invalid job id', { status: 404 });
    }

    const requestPng = rawId.toLowerCase().endsWith('.png');

    await connectDB();

    // Logo is populated so the admin preview matches what actually gets published.
    const job = await Job.findById(jobId)
      .populate('companyId', 'name logo')
      .lean();

    if (!job) {
      return new Response('Job not found', { status: 404 });
    }

    const searchParams = request.url ? new URL(request.url).searchParams : null;
    const jobForImage = job as InstagramImageJob;

    const slideRaw = searchParams?.get('slide');
    const slideIndex =
      slideRaw != null && slideRaw !== '' ? Number.parseInt(slideRaw, 10) : NaN;

    if (Number.isInteger(slideIndex) && slideIndex >= 0 && slideIndex <= 9) {
      const defaults = buildDefaultCarouselConfig(jobForImage);
      const fallback = defaults[Math.min(slideIndex, defaults.length - 1)] ?? defaults[0];
      const partial = searchParams
        ? parseSlideConfigFromSearchParams(searchParams)
        : {};
      const config = normalizeSlideConfig({ ...fallback, ...partial }, fallback);

      if (requestPng) {
        const pngBuffer = await generateInstagramSlidePngBuffer(
          jobForImage,
          slideIndex,
          config
        );
        return new Response(new Uint8Array(pngBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'no-store',
          },
        });
      }
      const jpegBuffer = await generateInstagramSlideBuffer(
        jobForImage,
        slideIndex,
        config
      );
      return new Response(new Uint8Array(jpegBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'no-store',
        },
      });
    }

    const posRaw = searchParams?.get('pos')?.toLowerCase();
    const pos: Pos = posRaw && POS_VALUES.includes(posRaw as Pos) ? (posRaw as Pos) : 'bl';
    const bgRaw = searchParams?.get('bg')?.toLowerCase();
    const bg: Bg = bgRaw && BG_VALUES.includes(bgRaw as Bg) ? (bgRaw as Bg) : 'grey';

    if (requestPng) {
      const pngBuffer = await generateInstagramImagePngBuffer(jobForImage, { pos, bg });
      return new Response(new Uint8Array(pngBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
    const jpegBuffer = await generateInstagramImageBuffer(jobForImage, { pos, bg });
    return new Response(new Uint8Array(jpegBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[instagram-image]', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`Failed to generate image: ${message}`, {
      status: 500,
    });
  }
}
