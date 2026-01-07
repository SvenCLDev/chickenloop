/**
 * Canonical Candidate Search Parameters
 * 
 * This file defines the single source of truth for candidate search state based on URL query parameters.
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
 * - sort (string): Sort order (default: 'newest' - by createdAt descending)
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
  
  /** Sort order (default: 'newest' - by createdAt descending) */
  sort?: string;
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
  if (sort) params.sort = decodeURIComponent(sort);
  
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
  
  if (params.sort && params.sort !== 'newest') {
    queryParts.push(`sort=${encodeURIComponent(params.sort)}`);
  }
  
  return queryParts.join('&');
}

/**
 * Convert CandidateSearchParams to URL object with query string
 * 
 * @param baseUrl - Base URL (default: '/candidates')
 * @param params - CandidateSearchParams object
 * @returns URL string with query parameters
 */
export function buildCandidateSearchUrl(baseUrl: string = '/candidates', params: CandidateSearchParams): string {
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
    (params.availability && params.availability.length > 0)
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

