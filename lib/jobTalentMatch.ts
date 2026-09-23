/**
 * Job → Talent matching helpers.
 * Shared by admin match counts and (later) recruiter emails / dashboard.
 */

import {
  type CandidateSearchParams,
  buildCandidateSearchQuery,
  buildCandidateSearchUrl,
} from '@/lib/candidateSearchParams';
import { countCVs } from '@/lib/loadCVs';
import { TALENT_LIST_PATH } from '@/lib/talentRoutes';

/** Looking for work: active + passive; excludes not_available / unset. */
export const LOOKING_AVAILABILITIES = [
  'available_now',
  'available_soon',
  'seasonal',
] as const;

/** Job occupationalAreas (snake_case) → CV lookingForWorkInAreas (Title Case). */
export const JOB_OCCUPATIONAL_AREA_TO_WORK_AREA: Record<string, string> = {
  instructor: 'Instruction',
  customer_support: 'Support',
  hospitality: 'Hospitality',
  sales: 'Sales',
  management: 'Management',
  marketing: 'Marketing',
  // other: skip — no clean 1:1
};

export type JobTalentMatchInput = {
  sports?: string[] | null;
  occupationalAreas?: string[] | null;
  languages?: string[] | null;
  country?: string | null;
};

function uniqueNonEmpty(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (typeof v !== 'string') continue;
    const t = v.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/**
 * Map a Job's requirement fields to talent-list CandidateSearchParams.
 * Empty job dimensions are omitted (no filter).
 */
export function jobToCandidateSearchParams(job: JobTalentMatchInput): CandidateSearchParams {
  const params: CandidateSearchParams = {
    availability: [...LOOKING_AVAILABILITIES],
    sort: 'last_active',
  };

  const sports = uniqueNonEmpty(job.sports || []);
  if (sports.length > 0) {
    params.sport = sports;
  }

  const workAreas = uniqueNonEmpty(
    (job.occupationalAreas || []).map((area) => JOB_OCCUPATIONAL_AREA_TO_WORK_AREA[area] || '')
  );
  if (workAreas.length > 0) {
    params.workArea = workAreas;
  }

  const languages = uniqueNonEmpty(job.languages || []);
  if (languages.length > 0) {
    params.language = languages;
  }

  const country =
    typeof job.country === 'string' && job.country.trim().length === 2
      ? job.country.trim().toUpperCase()
      : null;
  if (country) {
    // OR across preferred / eligible / no-sponsorship (see loadCVs work_country)
    params.workCountry = [country];
  }

  return params;
}

export function buildJobTalentMatchUrl(
  job: JobTalentMatchInput,
  baseUrl: string = TALENT_LIST_PATH
): string {
  return buildCandidateSearchUrl(baseUrl, jobToCandidateSearchParams(job));
}

export function candidateSearchParamsToURLSearchParams(
  params: CandidateSearchParams
): URLSearchParams {
  const qs = buildCandidateSearchQuery(params);
  return new URLSearchParams(qs);
}

/**
 * Count published job-seeker CVs matching the job (same filters as /talent deep-link).
 */
export async function countCvsMatchingJob(job: JobTalentMatchInput): Promise<number> {
  const params = jobToCandidateSearchParams(job);
  const searchParams = candidateSearchParamsToURLSearchParams(params);
  return countCVs(searchParams);
}

/** Run async work over items with a max concurrency limit. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, Math.max(items.length, 1)) }, () =>
    worker()
  );
  await Promise.all(workers);
  return results;
}
