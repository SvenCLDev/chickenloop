import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';

// Node.js required: Mongoose does not support Edge runtime
export const runtime = 'nodejs';

function clampTitle(title: string, maxChars: number = 70): string {
  if (!title) return '';
  if (title.length <= maxChars) return title;
  const trimmed = title.slice(0, maxChars);
  const lastSpace = trimmed.lastIndexOf(' ');
  const safeCut = lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed;
  return safeCut + '…';
}

/**
 * GET /api/instagram-image/[jobId]
 * Generates a 1080x1080 PNG image for Instagram post.
 * Does not call the Instagram API.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    if (!jobId) {
      return new Response('Job ID is required', { status: 400 });
    }

    await connectDB();

    const job = await Job.findById(jobId)
      .populate('companyId', 'name')
      .lean();

    if (!job) {
      return new Response('Job not found', { status: 404 });
    }

    const company = job.companyId as { name?: string } | null;
    const companyName = company?.name ?? '';
    const activity =
      (job.sports && job.sports[0]) ??
      (job.occupationalAreas && job.occupationalAreas[0]) ??
      '';
    const activityLabel = activity ? String(activity).toUpperCase() : '';
    const city = job.city ?? '';
    const country = job.country ?? '';
    const locationLine = [city, country].filter(Boolean).join(', ');
    const title = job.title ?? 'Job';
    const displayTitle = clampTitle(title);
    const backgroundImageUrl =
      job.pictures && job.pictures[0] && typeof job.pictures[0] === 'string'
        ? job.pictures[0]
        : null;

    const element = (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {backgroundImageUrl ? (
          <img
            src={backgroundImageUrl}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, #2563eb 0%, #0f172a 100%)',
            }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 80,
            maxWidth: '70%',
            background: 'rgba(0, 0, 0, 0.65)',
            padding: 40,
            borderRadius: 24,
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {activityLabel ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: '2px',
                color: 'rgba(255,255,255,0.95)',
                marginTop: 0,
              }}
            >
              {activityLabel}
            </div>
          ) : null}
          <div
            style={{
              display: 'block',
              overflow: 'hidden',
              fontSize: 36,
              fontWeight: 'bold',
              color: 'white',
              lineHeight: 1.25,
              maxWidth: '100%',
              minHeight: 160,
              wordBreak: 'break-word',
            }}
          >
            {displayTitle}
          </div>
          {locationLine ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                fontSize: 24,
                color: 'rgba(255,255,255,0.95)',
              }}
            >
              📍 {locationLine}
            </div>
          ) : null}
          {companyName ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                fontSize: 26,
                color: 'rgba(255,255,255,0.9)',
              }}
            >
              {companyName}
            </div>
          ) : null}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            right: 60,
            fontSize: 28,
            color: 'white',
            opacity: 0.5,
            fontWeight: 500,
          }}
        >
          chickenloop.com
        </div>
      </div>
    );

    return new ImageResponse(element, {
      width: 1080,
      height: 1080,
    });
  } catch (error) {
    console.error('[instagram-image]', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`Failed to generate image: ${message}`, {
      status: 500,
    });
  }
}
