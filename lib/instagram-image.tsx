/**
 * Shared Instagram card image generation.
 * Used by GET /api/instagram-image/[jobId] and by the Instagram post flow (upload to Blob then send URL to Meta).
 * Renders 1080x1350 (4:5 portrait), the tallest aspect ratio the feed allows.
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

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;

const PANEL_POSITION: Record<Pos, { bottom?: number; top?: number; left?: number; right?: number }> = {
  bl: { bottom: 96, left: 72 },
  br: { bottom: 96, right: 72 },
  tl: { top: 96, left: 72 },
  tr: { top: 96, right: 72 },
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

const TITLE_MAX_CHARS = 48;
const TITLE_FONT_SIZE = 64;
const TITLE_LINE_HEIGHT = 1.15;
/** Conservative characters-per-line for the title font inside the panel width. */
const TITLE_CHARS_PER_LINE = 18;

/**
 * Satori does not measure the height of wrapped text, so siblings render on top of it.
 * Reserve height up front from an estimated line count.
 */
function titleBoxHeight(title: string): number {
  const lines = Math.max(1, Math.ceil(title.length / TITLE_CHARS_PER_LINE));
  return Math.ceil(lines * TITLE_FONT_SIZE * TITLE_LINE_HEIGHT);
}

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
  companyId?: { name?: string | null; logo?: string | null };
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
 * Build the card JSX. Shared by the JPEG and PNG generators so the two cannot drift.
 * A job photo is used as a full-bleed background; a company logo is not, because
 * cropping a logo to fill the frame looks broken. Logos render as a contained badge instead.
 */
function buildCardElement(
  job: InstagramImageJob,
  options?: GenerateInstagramImageOptions
) {
  const pos = normalizePos(options?.pos);
  const bg = normalizeBg(options?.bg);
  // The post flow passes `company`; the preview route passes the populated `companyId`.
  const companyName = job.company?.name ?? job.companyId?.name ?? '';
  const activity = (job.sports?.[0] ?? job.occupationalAreas?.[0]) ?? '';
  const activityLabel = activity ? String(activity).toUpperCase() : '';
  const city = job.city ?? '';
  const country = job.country ?? '';
  const locationLine = [city, country].filter(Boolean).join(', ');
  const title = job.title ?? 'Job';
  const displayTitle = clampTitle(title, TITLE_MAX_CHARS);

  const photoUrl =
    job.pictures?.[0] && typeof job.pictures[0] === 'string' ? job.pictures[0] : null;
  const rawLogo = job.company?.logo ?? job.companyId?.logo ?? null;
  const logoUrl = typeof rawLogo === 'string' && rawLogo ? rawLogo : null;
  const showLogoBadge = !photoUrl && !!logoUrl;

  const panelStyle = PANEL_POSITION[pos];
  const panelBg = PANEL_BG[bg];
  const isPanelLeft = pos === 'bl' || pos === 'tl';
  const watermarkStyle = isPanelLeft
    ? { position: 'absolute' as const, bottom: 48, right: 60 }
    : { position: 'absolute' as const, bottom: 48, left: 60 };

  return (
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
      {photoUrl ? (
        <img
          src={photoUrl}
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
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: 'linear-gradient(180deg, #2563eb 0%, #0f172a 100%)',
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          ...panelStyle,
          maxWidth: '80%',
          background: panelBg,
          padding: 56,
          borderRadius: 28,
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {showLogoBadge ? (
          <div
            style={{
              display: 'flex',
              width: 180,
              height: 180,
              borderRadius: 20,
              background: 'rgba(255,255,255,0.95)',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <img
              src={logoUrl as string}
              alt=""
              style={{ width: 150, height: 150, objectFit: 'contain' }}
            />
          </div>
        ) : null}
        {activityLabel ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: '3px',
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
            minHeight: titleBoxHeight(displayTitle),
            fontSize: TITLE_FONT_SIZE,
            fontWeight: 'bold',
            color: 'white',
            lineHeight: TITLE_LINE_HEIGHT,
            maxWidth: '100%',
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
              fontSize: 34,
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
              fontSize: 36,
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
          fontSize: 32,
          color: 'white',
          opacity: 0.85,
          fontWeight: 600,
        }}
      >
        chickenloop.com
      </div>
    </div>
  );
}

/**
 * Generate the Instagram card image as a JPEG buffer (suitable for upload to Blob and for Instagram Graph API).
 */
export async function generateInstagramImageBuffer(
  job: InstagramImageJob,
  options?: GenerateInstagramImageOptions
): Promise<Buffer> {
  const pngResponse = new ImageResponse(buildCardElement(job, options), {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  });
  const pngBuffer = Buffer.from(await pngResponse.arrayBuffer());
  return sharp(pngBuffer).jpeg({ quality: 90 }).toBuffer();
}

/**
 * Generate the same image as PNG buffer (for GET /api/instagram-image/[jobId].png).
 */
export async function generateInstagramImagePngBuffer(
  job: InstagramImageJob,
  options?: GenerateInstagramImageOptions
): Promise<Buffer> {
  const pngResponse = new ImageResponse(buildCardElement(job, options), {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  });
  return Buffer.from(await pngResponse.arrayBuffer());
}
