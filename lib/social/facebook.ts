/**
 * Post a job to Facebook Page via Graph API.
 * Requires FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN in environment.
 */

import { getJobUrl } from '@/lib/jobSlug';
import { getCountryNameFromCode } from '@/lib/countryUtils';

const DESCRIPTION_MAX_CHARS = 200;

/** Strip HTML tags and truncate to maxChars, trimming to last full word. */
function extractDescriptionSummary(
  html: string | undefined,
  maxChars: number = DESCRIPTION_MAX_CHARS
): string {
  if (!html || typeof html !== 'string') return '';
  const stripped = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!stripped.length) return '';
  if (stripped.length <= maxChars) return stripped;
  const truncated = stripped.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0 ? truncated.slice(0, lastSpace).trim() : truncated;
}

/** Resolve company name from job (string or populated object). */
function getCompanyName(job: { company?: string | { name?: string } }): string {
  if (typeof job.company === 'string') return job.company;
  if (job.company && typeof job.company === 'object' && job.company.name) {
    return job.company.name;
  }
  return '';
}

export interface FacebookJobInput {
  title: string;
  city: string;
  country?: string | null;
  description?: string | null;
  company?: string | { name?: string };
}

export async function postJobToFacebook(job: FacebookJobInput) {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://www.chickenloop.com';

  if (!pageId || !token) {
    throw new Error('FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN must be set');
  }

  const jobPath = getJobUrl({ title: job.title, country: job.country });
  const jobUrl = `${siteUrl}${jobPath}`;

  const countryDisplay = job.country ? getCountryNameFromCode(job.country) || job.country : '';
  const companyName = getCompanyName(job);
  const summary = extractDescriptionSummary(job.description ?? undefined);

  const message = `${job.title}
📍 ${job.city}${countryDisplay ? `, ${countryDisplay}` : ''}
🏢 ${companyName || '—'}

${summary}...

More job details:
${jobUrl}`;

  const params = new URLSearchParams({
    message,
    link: jobUrl,
    access_token: token,
  });

  const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/feed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const data = (await res.json()) as { id?: string; error?: { message?: string } };

  if (!res.ok) {
    console.error('Facebook post failed:', data);
    throw new Error(data?.error?.message || 'Facebook post failed');
  }

  return data;
}
