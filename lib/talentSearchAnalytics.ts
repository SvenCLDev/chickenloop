import connectDB from '@/lib/db';
import type { CandidateSearchParams } from '@/lib/candidateSearchParams';
import TalentSearchAnalytics, {
  TALENT_SEARCH_ANALYTICS_EVENTS,
  type TalentSearchAnalyticsEvent,
  type TalentSearchAnalyticsRole,
} from '@/models/TalentSearchAnalytics';

export { TALENT_SEARCH_ANALYTICS_EVENTS, type TalentSearchAnalyticsEvent };

const FILTER_KEY_LABELS: Record<string, string> = {
  kw: 'Keyword',
  location: 'Location',
  workArea: 'Work area',
  language: 'Language',
  sport: 'Sport',
  certification: 'Certification',
  experienceLevel: 'Experience level',
  availability: 'Availability',
  preferredCountry: 'Preferred country',
  canWorkIn: 'Can work in',
  noSponsorshipIn: 'No sponsorship in',
  verifiedOnly: 'Verified only',
  sort: 'Sort',
};

/** Keys that count as “active filters” for rollups (exclude pagination). */
const TRACKED_FILTER_KEYS: (keyof CandidateSearchParams)[] = [
  'kw',
  'location',
  'workArea',
  'language',
  'sport',
  'certification',
  'experienceLevel',
  'availability',
  'preferredCountry',
  'canWorkIn',
  'noSponsorshipIn',
  'verifiedOnly',
  'sort',
];

function isNonEmptyFilterValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'boolean') return value === true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return false;
}

/**
 * Snapshot of search params suitable for analytics storage.
 * Keeps structured filters; strips empty values.
 */
export function snapshotCandidateFilters(
  filters: CandidateSearchParams
): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  for (const key of TRACKED_FILTER_KEYS) {
    const value = filters[key];
    if (!isNonEmptyFilterValue(value)) continue;
    if (key === 'sort' && (value === 'last_active' || value == null)) continue;
    snapshot[key] = value;
  }
  if (filters.page != null && filters.page > 1) {
    snapshot.page = filters.page;
  }
  return snapshot;
}

export function getActiveFilterKeys(filters: CandidateSearchParams): string[] {
  const keys: string[] = [];
  for (const key of TRACKED_FILTER_KEYS) {
    const value = filters[key];
    if (!isNonEmptyFilterValue(value)) continue;
    if (key === 'sort' && (value === 'last_active' || value == null)) continue;
    keys.push(key);
  }
  return keys;
}

export function labelForFilterKey(key: string): string {
  return FILTER_KEY_LABELS[key] ?? key;
}

export function listEventForPage(page?: number): TalentSearchAnalyticsEvent {
  return page != null && page > 1 ? 'talent_search_page' : 'talent_search';
}

export async function logTalentSearchEvent(options: {
  event: TalentSearchAnalyticsEvent;
  recruiterId: string;
  role: string;
  filters?: CandidateSearchParams | Record<string, unknown>;
  resultCount?: number | null;
  candidateId?: string | null;
}): Promise<void> {
  try {
    const role: TalentSearchAnalyticsRole =
      options.role === 'admin' ? 'admin' : 'recruiter';

    const filtersSnapshot =
      options.filters && typeof options.filters === 'object'
        ? snapshotCandidateFilters(options.filters as CandidateSearchParams)
        : undefined;
    const activeFilterKeys =
      options.filters && typeof options.filters === 'object'
        ? getActiveFilterKeys(options.filters as CandidateSearchParams)
        : [];

    await connectDB();
    await TalentSearchAnalytics.create({
      event: options.event,
      recruiterId: options.recruiterId,
      role,
      filters: filtersSnapshot,
      activeFilterKeys,
      resultCount:
        typeof options.resultCount === 'number' ? options.resultCount : null,
      candidateId: options.candidateId || null,
    });
  } catch (error) {
    console.error('[talentSearchAnalytics] Failed to log event:', error);
  }
}
