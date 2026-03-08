/**
 * Shared Instagram card image generation.
 * Used by GET /api/instagram-image/[jobId] and by the Instagram post flow (upload to Blob then send URL to Meta).
 */

import { ImageResponse } from 'next/og';
import sharp from 'sharp';

export const POS_VALUES = ['bl', 'br', 'tl', 'tr'] as const;
export const BG_VALUES = [
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
export type Pos = (typeof POS_VALUES)[number];
export type Bg = (typeof BG_VALUES)[number];

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

export interface InstagramImageJob {
  _id?: unknown;
  title?: string | null;
  city?: string | null;
  country?: string | null;
  sports?: unknown[];
  occupationalAreas?: unknown[];
  companyId?: { name?: string | null };
  company?: { name?: string | null; logo?: string | null };
  pictures?: (string | null)[];
}

export interface GenerateInstagramImageOptions {
  pos?: Pos | string;
  bg?: Bg | string;
}

function normalizePos(pos: Pos | string | undefined): Pos {
  if (!pos || typeof pos !== 'string') return 'bl';
  const p = pos.toLowerCase() as Pos;
  return POS_VALUES.includes(p) ? p : 'bl';
}

function normalizeBg(bg: Bg | string | undefined): Bg {
  if (!bg || typeof bg !== 'string') return 'grey';
  const b = bg.toLowerCase() as Bg;
  return BG_VALUES.includes(b) ? b : 'grey';
}

/**
 * Generate the Instagram card image as a JPEG buffer (suitable for upload to Blob and for Instagram Graph API).
 * Uses job.pictures[0] or job.company?.logo as background when available.
 */
export async function generateInstagramImageBuffer(
  job: InstagramImageJob,
  options?: GenerateInstagramImageOptions
): Promise<Buffer> {
  const pos = normalizePos(options?.pos);
  const bg = normalizeBg(options?.bg);
  const companyName =
    (job.company?.name ?? (job.companyId as { name?: string } | undefined)?.name) ?? '';
  const activity =
    (job.sports?.[0] ?? job.occupationalAreas?.[0]) ?? '';
  const activityLabel = activity ? String(activity).toUpperCase() : '';
  const city = job.city ?? '';
  const country = job.country ?? '';
  const locationLine = [city, country].filter(Boolean).join(', ');
  const title = job.title ?? 'Job';
  const displayTitle = clampTitle(title, TITLE_MAX_CHARS);
  const backgroundImageUrl =
    (job.pictures?.[0] && typeof job.pictures[0] === 'string'
      ? job.pictures[0]
      : null) ??
    (typeof job.company === 'object' && job.company?.logo && typeof job.company.logo === 'string'
      ? job.company.logo
      : null);

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

  const pngResponse = new ImageResponse(element, {
    width: 1080,
    height: 1080,
  });
  const pngBuffer = Buffer.from(await pngResponse.arrayBuffer());
  const jpegBuffer = await sharp(pngBuffer)
    .jpeg({ quality: 90 })
    .toBuffer();
  return jpegBuffer;
}

/**
 * Generate the same image as PNG buffer (for GET /api/instagram-image/[jobId].png).
 */
export async function generateInstagramImagePngBuffer(
  job: InstagramImageJob,
  options?: GenerateInstagramImageOptions
): Promise<Buffer> {
  const pos = normalizePos(options?.pos);
  const bg = normalizeBg(options?.bg);
  const companyName =
    (job.company?.name ?? (job.companyId as { name?: string } | undefined)?.name) ?? '';
  const activity =
    (job.sports?.[0] ?? job.occupationalAreas?.[0]) ?? '';
  const activityLabel = activity ? String(activity).toUpperCase() : '';
  const city = job.city ?? '';
  const country = job.country ?? '';
  const locationLine = [city, country].filter(Boolean).join(', ');
  const title = job.title ?? 'Job';
  const displayTitle = clampTitle(title, TITLE_MAX_CHARS);
  const backgroundImageUrl =
    (job.pictures?.[0] && typeof job.pictures[0] === 'string'
      ? job.pictures[0]
      : null) ??
    (typeof job.company === 'object' && job.company?.logo && typeof job.company.logo === 'string'
      ? job.company.logo
      : null);

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

  const pngResponse = new ImageResponse(element, {
    width: 1080,
    height: 1080,
  });
  return Buffer.from(await pngResponse.arrayBuffer());
}
