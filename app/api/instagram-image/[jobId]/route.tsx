import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';

// Node.js required: Mongoose does not support Edge runtime
export const runtime = 'nodejs';

const POS_VALUES = ['bl', 'br', 'tl', 'tr'] as const;
const BG_VALUES = [
  'grey',
  'navy',
  'blue',
  'teal',
  'yellow',
  'amber',
  'emerald',
  'green',
  'orange',
  'sunset',
  'red',
] as const;
type Pos = (typeof POS_VALUES)[number];
type Bg = (typeof BG_VALUES)[number];

const PANEL_POSITION: Record<Pos, { bottom?: number; top?: number; left?: number; right?: number }> = {
  bl: { bottom: 80, left: 80 },
  br: { bottom: 80, right: 80 },
  tl: { top: 80, left: 80 },
  tr: { top: 80, right: 80 },
};

const PANEL_BG: Record<Bg, string> = {
  grey: 'rgba(0, 0, 0, 0.65)',
  navy: 'rgba(15, 23, 42, 0.75)',
  blue: 'rgba(37, 99, 235, 0.75)',
  teal: 'rgba(13, 148, 136, 0.75)',
  yellow: 'rgba(250, 204, 21, 0.75)',
  amber: 'rgba(234, 179, 8, 0.75)',
  emerald: 'rgba(16, 185, 129, 0.65)',
  green: 'rgba(5, 150, 105, 0.65)',
  orange: 'rgba(249, 115, 22, 0.65)',
  sunset: 'rgba(234, 88, 12, 0.65)',
  red: 'rgba(239, 68, 68, 0.65)',
};

const TITLE_MAX_CHARS = 70;

function clampTitle(title: string, maxChars: number = TITLE_MAX_CHARS): string {
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
    const displayTitle = clampTitle(title, TITLE_MAX_CHARS);
    const backgroundImageUrl =
      job.pictures && job.pictures[0] && typeof job.pictures[0] === 'string'
        ? job.pictures[0]
        : null;

    const searchParams = request.url ? new URL(request.url).searchParams : null;
    const posRaw = searchParams?.get('pos')?.toLowerCase();
    const pos: Pos = posRaw && POS_VALUES.includes(posRaw as Pos) ? (posRaw as Pos) : 'bl';
    const bgRaw = searchParams?.get('bg')?.toLowerCase();
    const bg: Bg = bgRaw && BG_VALUES.includes(bgRaw as Bg) ? (bgRaw as Bg) : 'grey';

    const panelStyle = PANEL_POSITION[pos];
    const panelBg = PANEL_BG[bg];
    const isPanelLeft = pos === 'bl' || pos === 'tl';
    const watermarkStyle = isPanelLeft
      ? { position: 'absolute' as const, bottom: 40, right: 60 }
      : { position: 'absolute' as const, bottom: 40, left: 60 };

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
            ...panelStyle,
            maxWidth: '70%',
            background: panelBg,
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
            ...watermarkStyle,
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
