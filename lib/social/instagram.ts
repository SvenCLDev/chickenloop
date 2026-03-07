/**
 * Post a job to Instagram via Graph API (create media container + publish).
 * Requires INSTAGRAM_USER_ID and META_ACCESS_TOKEN in environment.
 * Updates the Job document with instagramPostId and instagramPostedAt on success.
 */

import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Job from '@/models/Job';

const MAX_HASHTAGS = 10;
const MIN_HASHTAG_LENGTH = 3;
const MAX_CAPTION_LENGTH = 1000;
const INSTAGRAM_CAPTION_MAX = 2000;
const SUMMARY_MAX_CHARS = 200;
const REQUIRED_HASHTAGS = ['#sportsjobs', '#hiring', '#watersportsjobs'];

const COUNTRY_MAP: Record<string, string> = {
  es: 'spain',
  uk: 'uk',
  de: 'germany',
  fr: 'france',
  it: 'italy',
  pt: 'portugal',
  us: 'usa',
  ca: 'canada',
  au: 'australia',
};

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

/** Build hashtag array from job fields. Max 10, no duplicates, no title-based hashtag. */
export function buildInstagramHashtags(job: any): string[] {
  const seen = new Set<string>(['sportsjobs', 'hiring', 'watersportsjobs']);
  const result: string[] = [...REQUIRED_HASHTAGS];

  const add = (val: string | undefined) => {
    const seg = typeof val === 'string' ? normalizeHashtag(val) : '';
    if (seg.length >= MIN_HASHTAG_LENGTH && !seen.has(seg)) {
      seen.add(seg);
      result.push(`#${seg}`);
    }
  };

  const addMany = (arr: unknown) => {
    if (Array.isArray(arr)) {
      for (const v of arr) {
        if (typeof v === 'string') add(v);
      }
    }
  };

  addMany(job.sports);
  addMany(job.occupationalAreas);
  add(job.city);

  const countryRaw = typeof job.country === 'string' ? job.country : '';
  const countryNorm = normalizeHashtag(countryRaw);
  if (countryNorm.length === 2 && COUNTRY_MAP[countryNorm]) {
    const countryTag = COUNTRY_MAP[countryNorm] + 'jobs';
    if (!seen.has(countryTag)) {
      seen.add(countryTag);
      result.push(`#${countryTag}`);
    }
  } else if (countryNorm.length >= MIN_HASHTAG_LENGTH && !seen.has(countryNorm)) {
    seen.add(countryNorm);
    result.push(`#${countryNorm}`);
  }

  add(job.type);

  return result.slice(0, MAX_HASHTAGS);
}

export interface InstagramPreview {
  imageUrl: string | null;
  caption: string;
  hashtags: string[];
  fullCaption: string;
}

/** Build caption, hashtags, and image URL for an Instagram post (no API calls). */
export function buildInstagramPreview(job: any): InstagramPreview {
  const imageUrl =
    job.pictures?.[0] ??
    (typeof job.company === 'object' && job.company?.logo
      ? (job.company as { logo?: string }).logo
      : undefined);
  const resolvedImageUrl =
    imageUrl && typeof imageUrl === 'string' ? imageUrl : null;

  const cityLabel = job.city ?? '';
  const countryLabel = job.country ?? '';
  const companyName =
    typeof job.company === 'string'
      ? job.company
      : typeof job.company === 'object' && job.company?.name
        ? (job.company as { name: string }).name
        : '';

  const summary = extractDescriptionSummary(job.description);
  const captionLines = [
    `🏄‍♂️ ${job.title ?? 'Job'}`,
    `📍 ${cityLabel}${cityLabel && countryLabel ? ', ' : ''}${countryLabel}`,
    `🏢 ${companyName}`,
    ...(summary ? [summary, ''] : ['']),
    'More job details at:',
    'chickenloop.com (link in bio)',
  ];
  let caption = captionLines.join('\n');

  const hashtags = buildInstagramHashtags(job);
  let fullCaption = caption + '\n\n' + hashtags.join(' ');
  if (fullCaption.length > MAX_CAPTION_LENGTH) {
    const hashtagSuffix = '\n\n' + hashtags.join(' ');
    const captionBudget = MAX_CAPTION_LENGTH - hashtagSuffix.length;
    const baseLines = [
      `🏄‍♂️ ${job.title ?? 'Job'}`,
      `📍 ${cityLabel}${cityLabel && countryLabel ? ', ' : ''}${countryLabel}`,
      `🏢 ${companyName}`,
      '',
      'More job details at:',
      'chickenloop.com (link in bio)',
    ];
    const baseCaption = baseLines.join('\n');
    const summaryBudget = Math.max(0, captionBudget - baseCaption.length - 2);
    const trimmedSummary = summaryBudget > 0
      ? extractDescriptionSummary(job.description, summaryBudget)
      : '';
    const finalLines = [
      ...baseLines.slice(0, 3),
      ...(trimmedSummary ? [trimmedSummary, ''] : ['']),
      ...baseLines.slice(4),
    ];
    caption = finalLines.join('\n');
    fullCaption = caption + hashtagSuffix;
  }

  return {
    imageUrl: resolvedImageUrl,
    caption,
    hashtags,
    fullCaption,
  };
}


/** Parse customTags into customHashtags and customMentions. Dedupe against auto hashtags. */
function parseCustomTags(
  raw: string,
  autoHashtagSegments: Set<string>
): { customHashtags: string[]; customMentions: string[] } {
  const customHashtags: string[] = [];
  const customMentions: string[] = [];
  if (!raw || typeof raw !== 'string') return { customHashtags, customMentions };

  const tokens = raw.trim().split(/\s+/).map((t) => t.trim()).filter(Boolean);
  const seenHashtags = new Set<string>();
  const seenMentions = new Set<string>();

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
        .replace(/[^a-zA-Z0-9_]/g, '')
        .toLowerCase();
      if (handle.length > 0 && !seenMentions.has(handle)) {
        seenMentions.add(handle);
        customMentions.push('@' + handle);
      }
    }
  }
  return { customHashtags, customMentions };
}

export async function postJobToInstagram(
  job: any,
  options?: { pos?: string; bg?: string; customTags?: string }
): Promise<string> {
  if (!process.env.INSTAGRAM_USER_ID || !process.env.META_ACCESS_TOKEN) {
    throw new Error('Missing Instagram environment variables.');
  }

  const jobId = job._id;
  if (!jobId) {
    throw new Error('Job must have an _id to post to Instagram.');
  }

  const hasImage =
    job.pictures?.[0] ||
    (typeof job.company === 'object' && job.company?.logo
      ? (job.company as { logo?: string }).logo
      : undefined);
  if (!hasImage || typeof hasImage !== 'string') {
    throw new Error(
      'Job must have an image: set job.pictures[0] or job.company.logo'
    );
  }

  if (job.instagramPostId) {
    throw new Error('Job already posted to Instagram.');
  }

  const pos = options?.pos ?? 'bl';
  const bg = options?.bg ?? 'grey';
  const jobIdStr = typeof jobId === 'string' ? jobId : String(jobId);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!baseUrl || typeof baseUrl !== 'string' || !baseUrl.startsWith('https://')) {
    throw new Error('NEXT_PUBLIC_SITE_URL must be set to the canonical site URL (e.g. https://www.chickenloop.com)');
  }
  const imageUrl = `${baseUrl.replace(/\/$/, '')}/api/instagram-image/${jobIdStr}?pos=${encodeURIComponent(pos)}&bg=${encodeURIComponent(bg)}&v=${Date.now()}`;

  const cityLabel = job.city ?? '';
  const countryLabel = job.country ?? '';
  const companyName =
    typeof job.company === 'string'
      ? job.company
      : typeof job.company === 'object' && job.company?.name
        ? (job.company as { name: string }).name
        : '';

  const summary = extractDescriptionSummary(job.description);
  const captionLines = [
    `🏄‍♂️ ${job.title ?? 'Job'}`,
    `📍 ${cityLabel}${cityLabel && countryLabel ? ', ' : ''}${countryLabel}`,
    `🏢 ${companyName}`,
    ...(summary ? [summary, ''] : ['']),
    'More job details at:',
    'chickenloop.com (link in bio)',
  ];
  const hashtags = buildInstagramHashtags(job);
  const autoHashtagSegments = new Set(hashtags.map((h) => h.slice(1).toLowerCase()));
  let caption = captionLines.join('\n') + '\n\n' + hashtags.join(' ');
  if (caption.length > MAX_CAPTION_LENGTH) {
    const hashtagSuffix = '\n\n' + hashtags.join(' ');
    const captionBudget = MAX_CAPTION_LENGTH - hashtagSuffix.length;
    const baseLines = [
      `🏄‍♂️ ${job.title ?? 'Job'}`,
      `📍 ${cityLabel}${cityLabel && countryLabel ? ', ' : ''}${countryLabel}`,
      `🏢 ${companyName}`,
      '',
      'More job details at:',
      'chickenloop.com (link in bio)',
    ];
    const baseCaption = baseLines.join('\n');
    const summaryBudget = Math.max(0, captionBudget - baseCaption.length - 2);
    const trimmedSummary = summaryBudget > 0
      ? extractDescriptionSummary(job.description, summaryBudget)
      : '';
    const finalLines = [
      ...baseLines.slice(0, 3),
      ...(trimmedSummary ? [trimmedSummary, ''] : ['']),
      ...baseLines.slice(4),
    ];
    caption = finalLines.join('\n') + hashtagSuffix;
  }

  const customTagsRaw = options?.customTags;
  let { customHashtags, customMentions } = parseCustomTags(
    typeof customTagsRaw === 'string' ? customTagsRaw : '',
    autoHashtagSegments
  );

  const parts: string[] = [caption];
  if (customHashtags.length > 0) parts.push('\n\n' + customHashtags.join(' '));
  if (customMentions.length > 0) parts.push('\n\n' + customMentions.join(' '));
  let finalCaption = parts.join('');

  if (finalCaption.length > INSTAGRAM_CAPTION_MAX) {
    while (customHashtags.length > 0 && finalCaption.length > INSTAGRAM_CAPTION_MAX) {
      customHashtags = customHashtags.slice(0, -1);
      const p: string[] = [caption];
      if (customHashtags.length > 0) p.push('\n\n' + customHashtags.join(' '));
      if (customMentions.length > 0) p.push('\n\n' + customMentions.join(' '));
      finalCaption = p.join('');
    }
    while (customMentions.length > 0 && finalCaption.length > INSTAGRAM_CAPTION_MAX) {
      customMentions = customMentions.slice(0, -1);
      const p: string[] = [caption];
      if (customHashtags.length > 0) p.push('\n\n' + customHashtags.join(' '));
      if (customMentions.length > 0) p.push('\n\n' + customMentions.join(' '));
      finalCaption = p.join('');
    }
    if (finalCaption.length > INSTAGRAM_CAPTION_MAX) {
      finalCaption = finalCaption.slice(0, INSTAGRAM_CAPTION_MAX);
    }
  }
  caption = finalCaption;

  const createParams = new URLSearchParams({
    image_url: imageUrl,
    caption,
    access_token: process.env.META_ACCESS_TOKEN!,
  });

  const createRes = await fetch(
    `https://graph.facebook.com/v18.0/${process.env.INSTAGRAM_USER_ID}/media`,
    {
      method: 'POST',
      body: createParams,
    }
  );

  const createData = await createRes.json();

  if (!createRes.ok) {
    console.error('Instagram create media failed:', {
      status: createRes.status,
      statusText: createRes.statusText,
      body: createData,
    });
    throw new Error(
      createData?.error?.message ||
        `Instagram create media failed: ${createRes.status}`
    );
  }

  const creationId = createData.id as string;
  if (!creationId) {
    console.error('Instagram create media: no id in response:', createData);
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
      `https://graph.facebook.com/v18.0/${creationId}?${statusParams}`
    );

    const statusData = (await statusRes.json()) as { status_code?: string };
    status = statusData?.status_code ?? 'IN_PROGRESS';
    attempts++;

    console.log('Instagram media status:', status);

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
    `https://graph.facebook.com/v18.0/${process.env.INSTAGRAM_USER_ID}/media_publish`,
    {
      method: 'POST',
      body: publishParams,
    }
  );

  const publishData = await publishRes.json();

  if (!publishRes.ok) {
    console.error('Instagram publish failed:', publishData);
    throw new Error(
      publishData?.error?.message ||
        `Instagram publish failed: ${publishRes.status}`
    );
  }

  const postId = publishData?.id;
  if (postId == null) {
    console.error('Instagram publish: no id in response:', publishData);
    throw new Error('Instagram publish did not return a media id');
  }

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
        instagramPostId: postId,
        instagramPostedAt: new Date(),
      },
    }
  );
  if (result.matchedCount === 0) {
    console.error('Job update failed: document not found', { jobId: String(jobId) });
    throw new Error('Failed to save Instagram post ID to job.');
  }

  return postId;
}
