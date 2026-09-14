/**
 * Utility functions for generating SEO-friendly slugs for job URLs
 *
 * URL format: /job/{country-slug}/{title-slug}-{idSuffix}
 * Example: /job/greece/kitesurf-instructor-c03ca93c
 *
 * The trailing 8 hex characters of the MongoDB ObjectId make every job URL unique
 * even when titles collide in the same country.
 */

import { getCountryNameFromCode } from './countryUtils';
import { COUNTRY_OPTIONS } from './countryUtils';
import { stripHtmlToText } from './sanitizeText';

const JOB_ID_SUFFIX_LENGTH = 8;
const ID_SUFFIX_RE = /^[a-f0-9]{8}$/i;

/**
 * Generate a URL-friendly slug from a string
 *
 * Rules:
 * - Lowercase
 * - Hyphen-separated
 * - ASCII only (removes accents and special characters)
 * - Removes special characters
 * - Trims repeated hyphens
 * - Deterministic (same input = same output)
 *
 * @param text - Input text to slugify
 * @returns URL-friendly slug
 */
export function generateSlug(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    // Convert to lowercase
    .toLowerCase()
    // Normalize Unicode characters (e.g., é -> e, ñ -> n)
    .normalize('NFD')
    // Remove diacritical marks (accents)
    .replace(/[\u0300-\u036f]/g, '')
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove all non-ASCII, non-alphanumeric characters except hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Replace multiple consecutive hyphens with a single hyphen
    .replace(/-+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate a job slug from job title (title segment only, no id suffix).
 *
 * @param title - Job title
 * @returns Job slug
 */
export function generateJobSlug(title: string): string {
  // Titles should be plain text, but some legacy/admin inputs may include HTML.
  // Strip tags/entities first so we don't accidentally create empty/garbled slugs.
  return generateSlug(stripHtmlToText(title));
}

/**
 * Last 8 hex characters of a MongoDB ObjectId (or any hex id string).
 */
export function jobIdSlugSuffix(jobId: string | { toString(): string } | unknown): string {
  const raw = String(jobId ?? '').trim().toLowerCase();
  const hex = raw.replace(/[^a-f0-9]/g, '');
  if (hex.length < JOB_ID_SUFFIX_LENGTH) {
    return hex.padStart(JOB_ID_SUFFIX_LENGTH, '0');
  }
  return hex.slice(-JOB_ID_SUFFIX_LENGTH);
}

/**
 * Build the full job path slug: `{titleSlug}-{idSuffix}`.
 */
export function buildJobPathSlug(
  title: string,
  jobId: string | { toString(): string } | unknown
): string {
  const base = generateJobSlug(title) || 'job';
  return `${base}-${jobIdSlugSuffix(jobId)}`;
}

/**
 * Parse a job URL slug into title base + optional id suffix.
 * New URLs end with `-{8 hex}`. Older title-only URLs have no suffix.
 */
export function parseJobSlug(slug: string): {
  baseSlug: string;
  idSuffix: string | null;
} {
  if (!slug || typeof slug !== 'string') {
    return { baseSlug: '', idSuffix: null };
  }
  const trimmed = slug.trim().toLowerCase();
  const lastHyphen = trimmed.lastIndexOf('-');
  if (lastHyphen <= 0) {
    return { baseSlug: trimmed, idSuffix: null };
  }
  const maybeSuffix = trimmed.slice(lastHyphen + 1);
  if (ID_SUFFIX_RE.test(maybeSuffix)) {
    return {
      baseSlug: trimmed.slice(0, lastHyphen),
      idSuffix: maybeSuffix.toLowerCase(),
    };
  }
  return { baseSlug: trimmed, idSuffix: null };
}

/**
 * Generate a country slug from country code or name
 *
 * Rules:
 * - Use lowercase country name (not country code)
 * - Convert country code to country name if needed
 * - Slugify the country name
 *
 * @param country - Country code (e.g., 'GR', 'US') or country name (e.g., 'Greece', 'United States')
 * @returns Country slug (e.g., 'greece', 'united-states')
 */
export function generateCountrySlug(country: string | null | undefined): string {
  if (!country) {
    return 'unknown';
  }

  // Check if it's already a country code (2 uppercase letters)
  const isCountryCode = /^[A-Z]{2}$/.test(country.trim().toUpperCase());

  let countryName: string;

  if (isCountryCode) {
    // Convert country code to country name
    countryName = getCountryNameFromCode(country);
    // If conversion failed, fall back to lowercase code
    if (!countryName || countryName === country.toUpperCase()) {
      countryName = country.toLowerCase();
    }
  } else {
    // Assume it's already a country name
    countryName = country;
  }

  // Generate slug from country name
  const slug = generateSlug(countryName);

  // Fallback if slug is empty
  return slug || 'unknown';
}

/**
 * Get country values (codes/names) that produce the given country slug.
 * Used for filtering jobs by country slug in DB queries.
 */
export function getCountryValuesForSlug(countrySlug: string): string[] {
  const values: string[] = [];
  const seen = new Set<string>();
  for (const { code, name } of COUNTRY_OPTIONS) {
    if (generateCountrySlug(code) === countrySlug && !seen.has(code)) {
      values.push(code);
      seen.add(code);
    }
    if (generateCountrySlug(name) === countrySlug && !seen.has(name)) {
      values.push(name);
      seen.add(name);
    }
  }
  if (countrySlug === 'unknown') {
    values.push(null as unknown as string, '');
  }
  return values;
}

export type JobUrlIdentity = {
  title: string;
  country?: string | null;
  _id?: string | { toString(): string } | null | unknown;
  id?: string | { toString(): string } | null | unknown;
};

function resolveJobId(job: JobUrlIdentity): string {
  const id = job._id ?? job.id;
  if (id == null || id === '') {
    throw new Error('Job id is required to build a unique job URL');
  }
  return String(id);
}

/**
 * Generate the full canonical job URL path
 *
 * Format: /job/{country-slug}/{title-slug}-{idSuffix}
 *
 * @param jobTitle - Job title
 * @param country - Country code or name
 * @param jobId - MongoDB ObjectId (required for uniqueness)
 * @returns Canonical job URL path
 */
export function generateJobUrlPath(
  jobTitle: string,
  country: string | null | undefined,
  jobId: string | { toString(): string } | unknown
): string {
  const countrySlug = generateCountrySlug(country);
  const jobSlug = buildJobPathSlug(jobTitle, jobId);
  return `/job/${countrySlug}/${jobSlug}`;
}

/**
 * Get the canonical URL for a job object
 *
 * This is the main helper function to use for generating job URLs throughout the app.
 *
 * @param job - Job object with `title`, `country`, and `_id` or `id`
 * @returns Canonical job URL path (e.g., "/job/greece/kitesurf-instructor-c03ca93c")
 *
 * @example
 * ```ts
 * const job = { _id: '6aa81fba0c59ccb2c03ca93c', title: 'Kitesurf Instructor', country: 'GR' };
 * const url = getJobUrl(job); // "/job/greece/kitesurf-instructor-c03ca93c"
 * ```
 */
export function getJobUrl(job: JobUrlIdentity): string {
  return generateJobUrlPath(job.title, job.country, resolveJobId(job));
}

/**
 * Among jobs that share a legacy title-only slug, pick the oldest published match
 * so the historically indexed URL redirects to a stable unique URL.
 */
export function pickOldestJobMatch<
  T extends { _id: unknown; createdAt?: Date | string | null }
>(matches: T[]): T | null {
  if (!matches.length) return null;
  return [...matches].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (aTime !== bTime) return aTime - bTime;
    return String(a._id).localeCompare(String(b._id));
  })[0];
}
