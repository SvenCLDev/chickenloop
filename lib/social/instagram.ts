/**
 * Post a job to Instagram via Graph API (create media container + publish).
 * Requires INSTAGRAM_USER_ID, META_ACCESS_TOKEN, and BLOB_READ_WRITE_TOKEN in environment.
 * Generates the card image once, uploads it to Vercel Blob, then sends the static blob URL to Instagram
 * so Meta's crawler can fetch it reliably (dynamic image URLs often timeout).
 */

import mongoose from 'mongoose';
import { put } from '@vercel/blob';
import connectDB from '@/lib/db';
import { generateInstagramImageBuffer } from '@/lib/instagram-image';
import { getCountryNameFromCode } from '@/lib/countryUtils';

const GRAPH_API_VERSION = 'v25.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const MAX_HASHTAGS = 10;
const MIN_HASHTAG_LENGTH = 3;
const MAX_CAPTION_LENGTH = 1000;
const INSTAGRAM_CAPTION_MAX = 2000;
const SUMMARY_MAX_CHARS = 200;
const MIN_SUMMARY_CHARS = 40;
const MAX_ALT_TEXT_LENGTH = 1000;
const MAX_COLLABORATORS = 3;

/** Broad anchor tag; always kept as the final hashtag so it survives the cap. */
const ANCHOR_HASHTAG = '#watersportsjobs';

/**
 * Niche hashtags per activity, keyed by the values in OFFERED_ACTIVITIES_LIST.
 * `slug` is the short form used for city combinations such as #tarifakitesurf.
 */
const SPORT_TAGS: Record<string, { tags: string[]; slug: string }> = {
  kitesurfing: { tags: ['kitesurfjobs', 'kitesurfinstructor', 'kitesurfing'], slug: 'kitesurf' },
  'hydrofoil kite surfing': { tags: ['kitefoiling', 'kitesurfjobs', 'kitesurfing'], slug: 'kitesurf' },
  windsurfing: { tags: ['windsurfjobs', 'windsurfinstructor', 'windsurfing'], slug: 'windsurf' },
  surfing: { tags: ['surfjobs', 'surfinstructor', 'surfcamp'], slug: 'surf' },
  'hydrofoil surfing': { tags: ['foilsurfing', 'surfjobs'], slug: 'surf' },
  'wing foiling': { tags: ['wingfoiling', 'wingfoil', 'watersportsinstructor'], slug: 'wingfoil' },
  'e-foil': { tags: ['efoil', 'efoiling'], slug: 'efoil' },
  sailing: { tags: ['sailingjobs', 'sailinginstructor', 'sailing'], slug: 'sailing' },
  catamaran: { tags: ['catamaran', 'sailingjobs'], slug: 'sailing' },
  yachting: { tags: ['yachtjobs', 'yachtcrew', 'yachting'], slug: 'yachting' },
  'scuba-diving': { tags: ['divejobs', 'divinginstructor', 'scubadiving'], slug: 'diving' },
  snorkeling: { tags: ['snorkeling', 'divejobs'], slug: 'diving' },
  'paddle boarding (SUP)': { tags: ['supjobs', 'supinstructor', 'paddleboarding'], slug: 'sup' },
  wakeboarding: { tags: ['wakeboarding', 'wakeparkjobs'], slug: 'wakeboard' },
  'water-skiing': { tags: ['waterskiing', 'wakeparkjobs'], slug: 'waterski' },
  kayaking: { tags: ['kayaking', 'kayakguide'], slug: 'kayak' },
  canoeing: { tags: ['canoeing', 'kayaking'], slug: 'canoe' },
  rafting: { tags: ['rafting', 'raftingguide'], slug: 'rafting' },
  canyoning: { tags: ['canyoning', 'canyoningguide'], slug: 'canyoning' },
  'jet-skiing': { tags: ['jetski', 'jetskiing'], slug: 'jetski' },
  flyboarding: { tags: ['flyboarding'], slug: 'flyboard' },
  parasailing: { tags: ['parasailing'], slug: 'parasailing' },
};

/** Hashtags per job category (occupationalAreas). */
const CATEGORY_TAGS: Record<string, string[]> = {
  instructor: ['instructorjobs'],
  hospitality: ['hospitalityjobs'],
  customer_support: ['customerservicejobs'],
  sales: ['salesjobs'],
  management: ['managementjobs'],
  marketing: ['marketingjobs'],
};

/** Instagram URL path segments that are never usernames. */
const RESERVED_INSTAGRAM_PATHS = new Set([
  'p',
  'reel',
  'reels',
  'stories',
  'explore',
  'tv',
  'accounts',
  'direct',
  'about',
  'legal',
  'developer',
]);

/** Extract short summary from HTML description: strip tags, first N chars, trim to last full word. */
function extractDescriptionSummary(
  html: string | undefined,
  maxChars: number = SUMMARY_MAX_CHARS
): string {
  if (!html || typeof html !== 'string') return '';
  const stripped = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!stripped.length) return '';
  if (stripped.length <= maxChars) return stripped;
  const truncated = stripped.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0 ? truncated.slice(0, lastSpace).trim() : truncated;
}

/** Normalize a value for use as hashtag segment: lowercase, strip accents, remove non-alphanumeric. No underscores or hyphens. */
function normalizeHashtag(value: string): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Validate and normalize a bare Instagram username. */
function normalizeHandle(value?: string | null): string | null {
  if (!value || typeof value !== 'string') return null;
  const handle = value.trim().replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(handle)) return null;
  if (RESERVED_INSTAGRAM_PATHS.has(handle)) return null;
  return handle;
}

/**
 * Extract an Instagram username from a profile URL, a bare handle, or an @handle.
 * Returns null for non-Instagram hosts, post/reel URLs, and malformed values.
 */
export function instagramHandleFromUrl(value?: string | null): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Bare handle or @handle, with no host or path component.
  if (!trimmed.includes('/') && !trimmed.includes('.')) {
    return normalizeHandle(trimmed);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (host !== 'instagram.com' && !host.endsWith('.instagram.com')) {
    return null;
  }

  const firstSegment = parsed.pathname.split('/').filter(Boolean)[0];
  if (!firstSegment) return null;

  return normalizeHandle(firstSegment);
}

/** Read the company's Instagram handle from the job's populated company, if present. */
export function resolveCompanyInstagramHandle(job: any): string | null {
  const company = job?.company;
  if (!company || typeof company !== 'object') return null;

  const social = (company as { socialMedia?: Record<string, unknown> }).socialMedia;
  const fromSocial = typeof social?.instagram === 'string' ? social.instagram : null;
  const fromDirect =
    typeof (company as { instagram?: unknown }).instagram === 'string'
      ? ((company as { instagram: string }).instagram)
      : null;

  return instagramHandleFromUrl(fromSocial ?? fromDirect);
}

function resolveCompanyName(job: any): string {
  if (typeof job?.company === 'string') return job.company;
  if (typeof job?.company === 'object' && job.company?.name) {
    return String(job.company.name);
  }
  return '';
}

/** Full country name for display and hashtags; job.country is stored as an ISO alpha-2 code. */
function resolveCountryLabel(job: any): string {
  const raw = typeof job?.country === 'string' ? job.country : '';
  if (!raw) return '';
  return getCountryNameFromCode(raw);
}

function resolveLocationLabel(job: any): string {
  const city = typeof job?.city === 'string' ? job.city : '';
  const country = resolveCountryLabel(job);
  return [city, country].filter(Boolean).join(', ');
}

/**
 * Build hashtag array from job fields: activity-specific tags first, broad anchor last.
 * Max 10, no duplicates. Deliberately excludes generic recruiting tags such as #hiring,
 * which are too large to rank in and attract the wrong audience.
 */
export function buildInstagramHashtags(job: any): string[] {
  const anchorSegment = ANCHOR_HASHTAG.slice(1);
  const seen = new Set<string>([anchorSegment]);
  const specific: string[] = [];

  const add = (raw: string | undefined) => {
    const segment = typeof raw === 'string' ? normalizeHashtag(raw) : '';
    if (segment.length >= MIN_HASHTAG_LENGTH && !seen.has(segment)) {
      seen.add(segment);
      specific.push(`#${segment}`);
    }
  };

  const sports: string[] = Array.isArray(job?.sports)
    ? job.sports.filter((s: unknown): s is string => typeof s === 'string')
    : [];

  for (const sport of sports) {
    const entry = SPORT_TAGS[sport.toLowerCase()];
    if (entry) entry.tags.forEach(add);
  }

  const citySegment = normalizeHashtag(typeof job?.city === 'string' ? job.city : '');
  const primarySport = sports.find((s) => SPORT_TAGS[s.toLowerCase()]);
  const sportSlug = primarySport ? SPORT_TAGS[primarySport.toLowerCase()].slug : '';

  // City + activity combinations are where niche discovery actually happens.
  if (citySegment.length >= MIN_HASHTAG_LENGTH && sportSlug) {
    add(citySegment + sportSlug);
  }
  add(citySegment);

  if (Array.isArray(job?.occupationalAreas)) {
    for (const area of job.occupationalAreas) {
      if (typeof area === 'string') {
        CATEGORY_TAGS[area.toLowerCase()]?.forEach(add);
      }
    }
  }

  const countrySegment = normalizeHashtag(resolveCountryLabel(job));
  if (countrySegment.length >= MIN_HASHTAG_LENGTH) {
    add(countrySegment + 'jobs');
  }

  return [...specific.slice(0, MAX_HASHTAGS - 1), ANCHOR_HASHTAG];
}

/** Alt text for the image, used for accessibility and content understanding. */
export function buildInstagramAltText(job: any): string {
  const title = job?.title ?? 'Job';
  const companyName = resolveCompanyName(job);
  const location = resolveLocationLabel(job);

  const parts = [String(title)];
  if (companyName) parts.push(`at ${companyName}`);
  if (location) parts.push(`in ${location}`);

  return `${parts.join(' ')}. Watersports job vacancy listed on Chickenloop.`.slice(
    0,
    MAX_ALT_TEXT_LENGTH
  );
}

export interface JobCaption {
  caption: string;
  hashtags: string[];
  fullCaption: string;
}

/**
 * Build the caption. The first line is the only part shown before Instagram truncates,
 * so it leads with role plus location, which is also what caption search indexes.
 */
export function buildJobCaption(
  job: any,
  options?: { companyHandle?: string | null }
): JobCaption {
  const hashtags = buildInstagramHashtags(job);
  const hashtagSuffix = '\n\n' + hashtags.join(' ');

  const title = job?.title ?? 'Job';
  const location = resolveLocationLabel(job);
  const companyName = resolveCompanyName(job);
  const handle = normalizeHandle(options?.companyHandle);

  const hook = location ? `${title} wanted in ${location}` : `${title} wanted`;

  let companyLine = '';
  if (companyName && handle) {
    companyLine = `🏢 ${companyName} (@${handle})`;
  } else if (companyName) {
    companyLine = `🏢 ${companyName}`;
  } else if (handle) {
    companyLine = `🏢 @${handle}`;
  }

  const compose = (summary: string): string => {
    const lines: string[] = [hook];
    if (companyLine) lines.push('', companyLine);
    if (summary) lines.push('', summary);
    lines.push('', "Know someone who'd be perfect? Tag them below.");
    lines.push('', 'Full details and how to apply: chickenloop.com (link in bio)');
    return lines.join('\n');
  };

  const withoutSummary = compose('');
  const summaryBudget =
    MAX_CAPTION_LENGTH - hashtagSuffix.length - withoutSummary.length - 2;
  const summary =
    summaryBudget >= MIN_SUMMARY_CHARS
      ? extractDescriptionSummary(job?.description, Math.min(SUMMARY_MAX_CHARS, summaryBudget))
      : '';

  const caption = compose(summary);
  return { caption, hashtags, fullCaption: caption + hashtagSuffix };
}

export interface InstagramPreview {
  imageUrl: string | null;
  caption: string;
  hashtags: string[];
  fullCaption: string;
  collaborator: string | null;
}

function resolveCardImageSource(job: any): string | null {
  const fromPictures = job?.pictures?.[0];
  if (typeof fromPictures === 'string' && fromPictures) return fromPictures;

  const logo =
    typeof job?.company === 'object' && job.company?.logo ? job.company.logo : undefined;
  return typeof logo === 'string' && logo ? logo : null;
}

/** Build caption, hashtags, collaborator and image URL for an Instagram post (no API calls). */
export function buildInstagramPreview(
  job: any,
  options?: { collaborator?: string | null }
): InstagramPreview {
  const collaborator =
    normalizeHandle(options?.collaborator) ?? resolveCompanyInstagramHandle(job);
  const { caption, hashtags, fullCaption } = buildJobCaption(job, {
    companyHandle: collaborator,
  });

  return {
    imageUrl: resolveCardImageSource(job),
    caption,
    hashtags,
    fullCaption,
    collaborator,
  };
}

/** Parse customTags into customHashtags and customMentions. Dedupe against auto hashtags and mentions. */
function parseCustomTags(
  raw: string,
  autoHashtagSegments: Set<string>,
  autoMentions: Set<string>
): { customHashtags: string[]; customMentions: string[] } {
  const customHashtags: string[] = [];
  const customMentions: string[] = [];
  if (!raw || typeof raw !== 'string') return { customHashtags, customMentions };

  const tokens = raw.trim().split(/\s+/).map((t) => t.trim()).filter(Boolean);
  const seenHashtags = new Set<string>();
  const seenMentions = new Set<string>(autoMentions);

  for (const token of tokens) {
    if (token.startsWith('#')) {
      const segment = token
        .slice(1)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/-/g, '')
        .replace(/[^a-z0-9]/g, '');
      if (segment.length > 0 && !autoHashtagSegments.has(segment) && !seenHashtags.has(segment)) {
        seenHashtags.add(segment);
        customHashtags.push('#' + segment);
      }
    } else if (token.startsWith('@')) {
      const handle = token
        .slice(1)
        .replace(/[^a-zA-Z0-9_.]/g, '')
        .toLowerCase();
      if (handle.length > 0 && !seenMentions.has(handle)) {
        seenMentions.add(handle);
        customMentions.push('@' + handle);
      }
    }
  }
  return { customHashtags, customMentions };
}

/** Place the user tag away from the text panel so it does not sit under the copy. */
function userTagPosition(pos?: string): { x: number; y: number } {
  const normalized = typeof pos === 'string' ? pos.toLowerCase() : 'bl';
  const panelIsTop = normalized === 'tl' || normalized === 'tr';
  return { x: 0.5, y: panelIsTop ? 0.75 : 0.25 };
}

/**
 * Meta rejects the whole container when a collaborator or tagged username is invalid,
 * private, or not reachable. Detect that so we can republish without the tagging fields.
 */
function isTaggingRelatedError(data: unknown): boolean {
  const error = (data as { error?: { message?: string; code?: number } })?.error;
  const message = String(error?.message ?? '').toLowerCase();
  return (
    message.includes('collaborator') ||
    message.includes('user_tag') ||
    message.includes('username') ||
    message.includes('tag') ||
    error?.code === 100
  );
}

async function createMediaContainer(
  params: Record<string, string>
): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(`${GRAPH_API_BASE}/${process.env.INSTAGRAM_USER_ID}/media`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export interface InstagramPostHistoryEntry {
  postId: string;
  postedAt: Date;
}

export interface InstagramPostHistoryUpdate {
  history: InstagramPostHistoryEntry[];
  instagramPostId: string;
  instagramPostedAt: Date;
}

/**
 * Build the next Instagram post history + latest fields after a successful publish.
 * Archives a legacy latest post into history when it is missing from the array,
 * then appends the new post without duplicating IDs.
 */
export function buildInstagramPostHistoryUpdate(
  existing: {
    instagramPostId?: string | null;
    instagramPostedAt?: Date | string | null;
    instagramPostHistory?: Array<{ postId: string; postedAt: Date | string }>;
  },
  newPostId: string,
  now: Date = new Date()
): InstagramPostHistoryUpdate {
  const history: InstagramPostHistoryEntry[] = (existing.instagramPostHistory ?? []).map((entry) => ({
    postId: String(entry.postId),
    postedAt:
      entry.postedAt instanceof Date ? entry.postedAt : new Date(entry.postedAt),
  }));

  const seen = new Set(history.map((entry) => entry.postId));

  if (existing.instagramPostId && !seen.has(existing.instagramPostId)) {
    const archivedAt =
      existing.instagramPostedAt != null
        ? existing.instagramPostedAt instanceof Date
          ? existing.instagramPostedAt
          : new Date(existing.instagramPostedAt)
        : now;
    history.push({
      postId: existing.instagramPostId,
      postedAt: archivedAt,
    });
    seen.add(existing.instagramPostId);
  }

  if (!seen.has(newPostId)) {
    history.push({ postId: newPostId, postedAt: now });
  }

  return {
    history,
    instagramPostId: newPostId,
    instagramPostedAt: now,
  };
}

export interface PostJobToInstagramResult {
  postId: string;
  postedAt: Date;
  postCount: number;
}

export async function postJobToInstagram(
  job: any,
  options?: { pos?: string; bg?: string; customTags?: string; collaborator?: string | null }
): Promise<PostJobToInstagramResult> {
  if (!process.env.INSTAGRAM_USER_ID || !process.env.META_ACCESS_TOKEN) {
    throw new Error('Missing Instagram environment variables.');
  }

  const jobId = job._id;
  if (!jobId) {
    throw new Error('Job must have an _id to post to Instagram.');
  }

  const hasImage = resolveCardImageSource(job);
  if (!hasImage) {
    throw new Error(
      'Job must have an image: set job.pictures[0] or job.company.logo'
    );
  }

  const jobIdStr = typeof jobId === 'string' ? jobId : String(jobId);

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is required to post to Instagram. The image is generated and uploaded to Vercel Blob so Meta can fetch it reliably.'
    );
  }

  // Generate the card image once and upload to Vercel Blob; Instagram requires a fast, static URL.
  const imageBuffer = await generateInstagramImageBuffer(job, {
    pos: options?.pos,
    bg: options?.bg,
  });
  const blobPath = `instagram/${jobIdStr}-${Date.now()}.jpg`;
  const blob = await put(blobPath, imageBuffer, {
    access: 'public',
    contentType: 'image/jpeg',
  });
  const imageUrl = blob.url;

  // A Collab post also appears in the company's own feed, which is what earns reshares.
  const collaborator =
    normalizeHandle(options?.collaborator) ?? resolveCompanyInstagramHandle(job);

  const { caption: baseCaption, hashtags } = buildJobCaption(job, {
    companyHandle: collaborator,
  });

  const autoHashtagSegments = new Set(hashtags.map((h) => h.slice(1).toLowerCase()));
  const autoMentions = new Set(collaborator ? [collaborator] : []);
  let { customHashtags, customMentions } = parseCustomTags(
    typeof options?.customTags === 'string' ? options.customTags : '',
    autoHashtagSegments,
    autoMentions
  );

  const assemble = (): string => {
    const parts: string[] = [baseCaption + '\n\n' + hashtags.join(' ')];
    if (customHashtags.length > 0) parts.push('\n\n' + customHashtags.join(' '));
    if (customMentions.length > 0) parts.push('\n\n' + customMentions.join(' '));
    return parts.join('');
  };

  let caption = assemble();
  while (customHashtags.length > 0 && caption.length > INSTAGRAM_CAPTION_MAX) {
    customHashtags = customHashtags.slice(0, -1);
    caption = assemble();
  }
  while (customMentions.length > 0 && caption.length > INSTAGRAM_CAPTION_MAX) {
    customMentions = customMentions.slice(0, -1);
    caption = assemble();
  }
  if (caption.length > INSTAGRAM_CAPTION_MAX) {
    caption = caption.slice(0, INSTAGRAM_CAPTION_MAX);
  }

  const baseParams: Record<string, string> = {
    image_url: imageUrl,
    caption,
    alt_text: buildInstagramAltText(job),
    access_token: process.env.META_ACCESS_TOKEN!,
  };

  const taggingParams: Record<string, string> = {};
  if (collaborator) {
    const { x, y } = userTagPosition(options?.pos);
    taggingParams.collaborators = JSON.stringify([collaborator].slice(0, MAX_COLLABORATORS));
    taggingParams.user_tags = JSON.stringify([{ username: collaborator, x, y }]);
  }

  const hasTagging = Object.keys(taggingParams).length > 0;
  let created = await createMediaContainer({ ...baseParams, ...taggingParams });

  if (!created.ok && hasTagging && isTaggingRelatedError(created.data)) {
    console.warn(
      `[instagram] Retrying without collaborator/user tags for @${collaborator}:`,
      created.data?.error?.message
    );
    created = await createMediaContainer(baseParams);
  }

  if (!created.ok) {
    throw new Error(
      created.data?.error?.message ||
        `Instagram create media failed: ${created.status}`
    );
  }

  const creationId = created.data.id as string;
  if (!creationId) {
    console.error('Instagram create media: no id in response:', created.data);
    throw new Error('Instagram create media did not return a container id');
  }

  const maxAttempts = 10;
  const delayMs = 2000;
  let status: string = 'IN_PROGRESS';
  let attempts = 0;

  while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    const statusParams = new URLSearchParams({
      fields: 'status_code',
      access_token: process.env.META_ACCESS_TOKEN!,
    });

    const statusRes = await fetch(
      `${GRAPH_API_BASE}/${creationId}?${statusParams}`
    );

    const statusData = (await statusRes.json()) as { status_code?: string };
    status = statusData?.status_code ?? 'IN_PROGRESS';
    attempts++;


    if (status === 'FINISHED' || status === 'ERROR') {
      break;
    }
  }

  if (status === 'ERROR') {
    throw new Error('Instagram media processing failed.');
  }
  if (status !== 'FINISHED') {
    throw new Error('Instagram media processing timed out.');
  }

  const publishParams = new URLSearchParams({
    creation_id: creationId,
    access_token: process.env.META_ACCESS_TOKEN!,
  });

  const publishRes = await fetch(
    `${GRAPH_API_BASE}/${process.env.INSTAGRAM_USER_ID}/media_publish`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: publishParams,
    }
  );

  const publishData = await publishRes.json();

  if (!publishRes.ok) {
    throw new Error(
      publishData?.error?.message ||
        `Instagram publish failed: ${publishRes.status}`
    );
  }

  if (publishData?.id == null) {
    console.error('Instagram publish: no id in response:', publishData);
    throw new Error('Instagram publish did not return a media id');
  }

  const postId = String(publishData.id);
  const postedAt = new Date();
  const historyUpdate = buildInstagramPostHistoryUpdate(
    {
      instagramPostId: job.instagramPostId,
      instagramPostedAt: job.instagramPostedAt,
      instagramPostHistory: job.instagramPostHistory,
    },
    postId,
    postedAt
  );

  await connectDB();
  // Use native driver so updatedAt is not changed (listing order must not be affected by Instagram post)
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not available');
  }
  const result = await db.collection('jobs').updateOne(
    { _id: new mongoose.Types.ObjectId(jobId) },
    {
      $set: {
        instagramPostId: historyUpdate.instagramPostId,
        instagramPostedAt: historyUpdate.instagramPostedAt,
        instagramPostHistory: historyUpdate.history,
      },
    }
  );
  if (result.matchedCount === 0) {
    console.error('Job update failed: document not found', { jobId: String(jobId) });
    throw new Error('Failed to save Instagram post ID to job.');
  }

  return {
    postId: historyUpdate.instagramPostId,
    postedAt: historyUpdate.instagramPostedAt,
    postCount: historyUpdate.history.length,
  };
}
