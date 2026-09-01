/**
 * Canonical Candidate Search Parameters
 * All candidate search functionality should use these parameters to ensure consistency across the application.
 * 
 * IMPORTANT: These parameters are the canonical definition. Any code that handles candidate search
 * should reference this file and use these exact parameter names.
 * 
 * Supported URL Query Parameters (canonical list):
 * - kw (string): Keyword search term matching CV title/headline, skills, certifications, summary, work area, and past job titles
 * - location (string): Location/address search for candidate location filtering
 * - work_area (string): Work area filters (multi-select, comma-separated, maps to lookingForWorkInAreas in CV model)
 * - language (string): Language filters (multi-select, comma-separated)
 * - sports (string): Sports/activities filters (multi-select, comma-separated, maps to experienceAndSkill in CV model)
 * - certifications (string): Professional certification filters (multi-select, comma-separated)
 * - experience_level (string): Experience level filters (multi-select, comma-separated: entry, intermediate, experienced, senior)
 * - availability (string): Availability filters (multi-select, comma-separated: available_now, available_soon, seasonal, not_available)
 * - page (number): Page number for pagination (default: 1)
 * - sort (string): Sort order (default: 'last_active' - by last login / profile activity)
 * 
 * Usage:
 *   import { CandidateSearchParams, parseCandidateSearchParams, buildCandidateSearchQuery } from '@/lib/candidateSearchParams';
 * 
 *   // Parse URL search params
 *   const params = parseCandidateSearchParams(searchParams);
 * 
 *   // Build URL query string
 *   const queryString = buildCandidateSearchQuery(params);
 * 
 * Multi-select Parameters:
 * - Multi-select parameters (work_area, language, sports, certifications, experience_level, availability) 
 *   are represented as arrays in the internal interface but as comma-separated strings in URLs
 *   (e.g., ?work_area=Instruction,Support&language=English,Spanish)
 */

import { TALENT_LIST_PATH } from '@/lib/talentRoutes';

/** Default talent list sort: recently active job seekers first. */
export const DEFAULT_CANDIDATE_SORT = 'last_active';

/** UI labels for sort dropdown and filter chips. */
export const CANDIDATE_SORT_LABELS: Record<string, string> = {
  last_active: 'Recently active',
  updated: 'Recently updated',
  created: 'Newest profiles',
  oldest: 'Oldest profiles',
};

/**
 * Normalize sort key from URL or UI. Legacy URLs used sort=newest for updatedAt ordering.
 */
export function normalizeCandidateSortKey(sort?: string): string {
  if (!sort || sort === DEFAULT_CANDIDATE_SORT) return DEFAULT_CANDIDATE_SORT;
  if (sort === 'newest') return 'updated';
  if (sort in CANDIDATE_SORT_LABELS) return sort;
  return DEFAULT_CANDIDATE_SORT;
}

/**
 * Canonical candidate search parameters interface
 * These parameters represent the complete state of a candidate search
 */
export interface CandidateSearchParams {
  /** Keyword search term matching CV title/headline, skills, certifications, summary, work area, and past job titles */
  kw?: string;
  
  /** Semantic location search - searches address field */
  location?: string;
  
  /** Work area filters (multi-select, maps to lookingForWorkInAreas in CV model) */
  workArea?: string[];
  
  /** Language filters (multi-select) */
  language?: string[];
  
  /** Sports/activities filters (multi-select, maps to experienceAndSkill in CV model) */
  sport?: string[];
  
  /** Professional certification filters (multi-select) */
  certification?: string[];
  
  /** Experience level filters (multi-select: entry, intermediate, experienced, senior) */
  experienceLevel?: string[];
  
  /** Availability filters (multi-select: available_now, available_soon, seasonal, not_available) */
  availability?: string[];
  
  /** Page number for pagination (default: 1) */
  page?: number;
  
  /** Sort order (default: 'last_active' - by last login with profile fallbacks) */
  sort?: string;

  /** When true, only CVs with at least one Chickenloop-verified certificate */
  verifiedOnly?: boolean;

  /** Preferred work country filter (ISO code, maps to preferredWorkCountries) */
  preferredCountry?: string[];

  /** Can legally work in country filter (ISO code, maps to workEligibleCountries) */
  canWorkIn?: string[];

  /** Can work without sponsorship in country (ISO code, maps to canWorkWithoutSponsorshipIn) */
  noSponsorshipIn?: string[];
}

/**
 * Parse URL search parameters into canonical CandidateSearchParams object
 * 
 * @param searchParams - URLSearchParams object from Next.js useSearchParams() or URL.searchParams
 * @returns CandidateSearchParams object with decoded values
 */
export function parseCandidateSearchParams(searchParams: URLSearchParams | ReadonlyURLSearchParams): CandidateSearchParams {
  const params: CandidateSearchParams = {};
  
  const kw = searchParams.get('kw');
  if (kw) params.kw = decodeURIComponent(kw);
  
  const location = searchParams.get('location');
  if (location) params.location = decodeURIComponent(location);
  
  // Multi-select parameters: parse comma-separated values
  const workAreaParam = searchParams.get('work_area');
  if (workAreaParam) {
    params.workArea = workAreaParam.split(',').map(v => decodeURIComponent(v.trim())).filter(v => v.length > 0);
  }
  
  const languageParam = searchParams.get('language');
  if (languageParam) {
    params.language = languageParam.split(',').map(v => decodeURIComponent(v.trim())).filter(v => v.length > 0);
  }
  
  const sportsParam = searchParams.get('sports');
  if (sportsParam) {
    params.sport = sportsParam.split(',').map(v => decodeURIComponent(v.trim())).filter(v => v.length > 0);
  }
  
  const certificationsParam = searchParams.get('certifications');
  if (certificationsParam) {
    params.certification = certificationsParam.split(',').map(v => decodeURIComponent(v.trim())).filter(v => v.length > 0);
  }
  
  const experienceLevelParam = searchParams.get('experience_level');
  if (experienceLevelParam) {
    params.experienceLevel = experienceLevelParam.split(',').map(v => decodeURIComponent(v.trim())).filter(v => v.length > 0);
  }
  
  const availabilityParam = searchParams.get('availability');
  if (availabilityParam) {
    params.availability = availabilityParam.split(',').map(v => decodeURIComponent(v.trim())).filter(v => v.length > 0);
  }
  
  const page = searchParams.get('page');
  if (page) {
    const pageNum = parseInt(page, 10);
    if (!isNaN(pageNum) && pageNum > 0) {
      params.page = pageNum;
    }
  }
  
  const sort = searchParams.get('sort');
  if (sort) params.sort = normalizeCandidateSortKey(decodeURIComponent(sort));

  if (searchParams.get('verified_only') === 'true') {
    params.verifiedOnly = true;
  }

  const preferredCountryParam = searchParams.get('preferred_country');
  if (preferredCountryParam) {
    params.preferredCountry = preferredCountryParam
      .split(',')
      .map((v) => decodeURIComponent(v.trim()).toUpperCase())
      .filter((v) => v.length === 2);
  }

  const canWorkInParam = searchParams.get('can_work_in');
  if (canWorkInParam) {
    params.canWorkIn = canWorkInParam
      .split(',')
      .map((v) => decodeURIComponent(v.trim()).toUpperCase())
      .filter((v) => v.length === 2);
  }

  const noSponsorshipParam = searchParams.get('no_sponsorship_in');
  if (noSponsorshipParam) {
    params.noSponsorshipIn = noSponsorshipParam
      .split(',')
      .map((v) => decodeURIComponent(v.trim()).toUpperCase())
      .filter((v) => v.length === 2);
  }
  
  return params;
}

/**
 * Build URL query string from CandidateSearchParams object
 * 
 * @param params - CandidateSearchParams object
 * @returns URL query string (without leading '?')
 */
export function buildCandidateSearchQuery(params: CandidateSearchParams): string {
  const queryParts: string[] = [];
  
  if (params.kw) {
    queryParts.push(`kw=${encodeURIComponent(params.kw)}`);
  }
  
  if (params.location) {
    queryParts.push(`location=${encodeURIComponent(params.location)}`);
  }
  
  // Multi-select parameters: join values with commas
  if (params.workArea && params.workArea.length > 0) {
    queryParts.push(`work_area=${encodeURIComponent(params.workArea.join(','))}`);
  }
  
  if (params.language && params.language.length > 0) {
    queryParts.push(`language=${encodeURIComponent(params.language.join(','))}`);
  }
  
  if (params.sport && params.sport.length > 0) {
    queryParts.push(`sports=${encodeURIComponent(params.sport.join(','))}`);
  }
  
  if (params.certification && params.certification.length > 0) {
    queryParts.push(`certifications=${encodeURIComponent(params.certification.join(','))}`);
  }
  
  if (params.experienceLevel && params.experienceLevel.length > 0) {
    queryParts.push(`experience_level=${encodeURIComponent(params.experienceLevel.join(','))}`);
  }
  
  if (params.availability && params.availability.length > 0) {
    queryParts.push(`availability=${encodeURIComponent(params.availability.join(','))}`);
  }
  
  if (params.page && params.page > 1) {
    queryParts.push(`page=${params.page}`);
  }
  
  if (params.sort && params.sort !== DEFAULT_CANDIDATE_SORT) {
    queryParts.push(`sort=${encodeURIComponent(params.sort)}`);
  }

  if (params.verifiedOnly) {
    queryParts.push('verified_only=true');
  }

  if (params.preferredCountry && params.preferredCountry.length > 0) {
    queryParts.push(`preferred_country=${encodeURIComponent(params.preferredCountry.join(','))}`);
  }

  if (params.canWorkIn && params.canWorkIn.length > 0) {
    queryParts.push(`can_work_in=${encodeURIComponent(params.canWorkIn.join(','))}`);
  }

  if (params.noSponsorshipIn && params.noSponsorshipIn.length > 0) {
    queryParts.push(`no_sponsorship_in=${encodeURIComponent(params.noSponsorshipIn.join(','))}`);
  }
  
  return queryParts.join('&');
}

/**
 * Convert CandidateSearchParams to URL object with query string
 * 
 * @param baseUrl - Base URL (default: '/talent')
 * @param params - CandidateSearchParams object
 * @returns URL string with query parameters
 */
export function buildCandidateSearchUrl(baseUrl: string = TALENT_LIST_PATH, params: CandidateSearchParams): string {
  const queryString = buildCandidateSearchQuery(params);
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Check if CandidateSearchParams object has any active filters
 * 
 * @param params - CandidateSearchParams object
 * @returns true if at least one filter is set
 */
export function hasActiveFilters(params: CandidateSearchParams): boolean {
  return !!(
    params.kw || 
    params.location || 
    (params.workArea && params.workArea.length > 0) ||
    (params.language && params.language.length > 0) ||
    (params.sport && params.sport.length > 0) ||
    (params.certification && params.certification.length > 0) ||
    (params.experienceLevel && params.experienceLevel.length > 0) ||
    (params.availability && params.availability.length > 0) ||
    (params.preferredCountry && params.preferredCountry.length > 0) ||
    (params.canWorkIn && params.canWorkIn.length > 0) ||
    (params.noSponsorshipIn && params.noSponsorshipIn.length > 0) ||
    params.verifiedOnly
  );
}

/**
 * Clear all filters from CandidateSearchParams
 * 
 * @returns Empty CandidateSearchParams object
 */
export function clearCandidateSearchParams(): CandidateSearchParams {
  return {};
}

/** Flat filter state for the candidates list UI (single-select fields). */
export interface CandidateListFilters {
  kw: string;
  location: string;
  sport: string;
  certification: string;
  availability: string;
  workArea: string;
  language: string;
  experienceLevel: string;
  canWorkIn: string;
  preferredCountry: string;
  noSponsorshipIn: string;
  verifiedOnly: boolean;
  sort: string;
}

export const EMPTY_CANDIDATE_LIST_FILTERS: CandidateListFilters = {
  kw: '',
  location: '',
  sport: '',
  certification: '',
  availability: '',
  workArea: '',
  language: '',
  experienceLevel: '',
  canWorkIn: '',
  preferredCountry: '',
  noSponsorshipIn: '',
  verifiedOnly: false,
  sort: DEFAULT_CANDIDATE_SORT,
};

export function searchParamsToCandidateListFilters(
  params: CandidateSearchParams
): CandidateListFilters {
  return {
    kw: params.kw || '',
    location: params.location || '',
    sport: params.sport?.[0] || '',
    certification: params.certification?.[0] || '',
    availability: params.availability?.[0] || '',
    workArea: params.workArea?.[0] || '',
    language: params.language?.[0] || '',
    experienceLevel: params.experienceLevel?.[0] || '',
    canWorkIn: params.canWorkIn?.[0] || '',
    preferredCountry: params.preferredCountry?.[0] || '',
    noSponsorshipIn: params.noSponsorshipIn?.[0] || '',
    verifiedOnly: params.verifiedOnly === true,
    sort: normalizeCandidateSortKey(params.sort),
  };
}

export function candidateListFiltersToSearchParams(
  filters: CandidateListFilters,
  page = 1
): CandidateSearchParams {
  const params: CandidateSearchParams = {};
  if (filters.kw.trim()) params.kw = filters.kw.trim();
  if (filters.location.trim()) params.location = filters.location.trim();
  if (filters.sport) params.sport = [filters.sport];
  if (filters.certification) params.certification = [filters.certification];
  if (filters.availability) params.availability = [filters.availability];
  if (filters.workArea) params.workArea = [filters.workArea];
  if (filters.language) params.language = [filters.language];
  if (filters.experienceLevel) params.experienceLevel = [filters.experienceLevel];
  if (filters.canWorkIn) params.canWorkIn = [filters.canWorkIn];
  if (filters.preferredCountry) params.preferredCountry = [filters.preferredCountry];
  if (filters.noSponsorshipIn) params.noSponsorshipIn = [filters.noSponsorshipIn];
  if (filters.verifiedOnly) params.verifiedOnly = true;
  if (filters.sort && filters.sort !== DEFAULT_CANDIDATE_SORT) params.sort = filters.sort;
  if (page > 1) params.page = page;
  return params;
}

export type CandidateFilterChip = {
  key: keyof CandidateListFilters;
  label: string;
  value: string;
};

const EXPERIENCE_LEVEL_LABELS: Record<string, string> = {
  entry: 'Entry',
  intermediate: 'Intermediate',
  experienced: 'Experienced',
  senior: 'Senior',
};

const AVAILABILITY_LABELS: Record<string, string> = {
  available_now: 'Available now',
  available_soon: 'Available soon',
  seasonal: 'Seasonal',
  not_available: 'Not available',
};

export function buildCandidateFilterChips(
  filters: CandidateListFilters,
  countryName: (code: string) => string
): CandidateFilterChip[] {
  const chips: CandidateFilterChip[] = [];
  if (filters.kw.trim()) chips.push({ key: 'kw', label: 'Search', value: filters.kw.trim() });
  if (filters.location.trim()) chips.push({ key: 'location', label: 'Location', value: filters.location.trim() });
  if (filters.sport) chips.push({ key: 'sport', label: 'Sport', value: filters.sport });
  if (filters.certification) chips.push({ key: 'certification', label: 'Certification', value: filters.certification });
  if (filters.availability) {
    chips.push({
      key: 'availability',
      label: 'Availability',
      value: AVAILABILITY_LABELS[filters.availability] || filters.availability,
    });
  }
  if (filters.workArea) chips.push({ key: 'workArea', label: 'Work area', value: filters.workArea });
  if (filters.language) chips.push({ key: 'language', label: 'Language', value: filters.language });
  if (filters.experienceLevel) {
    chips.push({
      key: 'experienceLevel',
      label: 'Experience',
      value: EXPERIENCE_LEVEL_LABELS[filters.experienceLevel] || filters.experienceLevel,
    });
  }
  if (filters.canWorkIn) {
    chips.push({ key: 'canWorkIn', label: 'Can work in', value: countryName(filters.canWorkIn) });
  }
  if (filters.preferredCountry) {
    chips.push({ key: 'preferredCountry', label: 'Open to', value: countryName(filters.preferredCountry) });
  }
  if (filters.noSponsorshipIn) {
    chips.push({
      key: 'noSponsorshipIn',
      label: 'No sponsorship',
      value: countryName(filters.noSponsorshipIn),
    });
  }
  if (filters.verifiedOnly) chips.push({ key: 'verifiedOnly', label: 'Verified', value: 'Qualifications only' });
  if (filters.sort && filters.sort !== DEFAULT_CANDIDATE_SORT) {
    chips.push({
      key: 'sort',
      label: 'Sort',
      value: CANDIDATE_SORT_LABELS[filters.sort] || filters.sort,
    });
  }
  return chips;
}

// Type guard for URLSearchParams compatibility
type ReadonlyURLSearchParams = {
  get(name: string): string | null;
  getAll(name: string): string[];
  has(name: string): boolean;
  keys(): IterableIterator<string>;
  values(): IterableIterator<string>;
  entries(): IterableIterator<[string, string]>;
  forEach(callbackfn: (value: string, key: string, parent: URLSearchParams) => void): void;
  sort(): void;
  toString(): string;
  size?: number;
};

