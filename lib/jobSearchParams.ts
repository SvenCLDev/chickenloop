/**
 * Canonical Job Search Parameters
 * 
 * This file defines the single source of truth for job search state based on URL query parameters.
 * All job search functionality should use these parameters to ensure consistency across the application.
 * 
 * IMPORTANT: These parameters are the canonical definition. Any code that handles job search
 * should reference this file and use these exact parameter names.
 * 
 * Supported URL Query Parameters (canonical list):
 * - keyword (string): Search term matching job title, description, or company name
 * - location (string): Location/city name for job location filtering
 * - country (string): ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB', 'FR')
 * - category (string): Job category/occupational area filter
 * - activity (string): Sports/activities filter (maps to 'sport' field in Job model)
 * - language (string): Required language filter
 * 
 * Usage:
 *   import { JobSearchParams, parseJobSearchParams, buildJobSearchQuery } from '@/lib/jobSearchParams';
 * 
 *   // Parse URL search params
 *   const params = parseJobSearchParams(searchParams);
 * 
 *   // Build URL query string
 *   const queryString = buildJobSearchQuery(params);
 * 
 * Migration Note:
 * - The 'activity' parameter maps to the 'sport' field in the Job model
 * - Existing code may use 'sport' in URLs - this should be migrated to 'activity' for consistency
 */

/**
 * Canonical job search parameters interface
 * These parameters represent the complete state of a job search
 */
export interface JobSearchParams {
  /** Search term matching job title, description, or company name */
  keyword?: string;
  
  /** Semantic location search - searches both city (location field) and country fields with OR logic */
  location?: string;
  
  /** ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB', 'FR') */
  country?: string;
  
  /** Job category/occupational area filter */
  category?: string;
  
  /** Sports/activities filter (maps to 'sport' field in Job model) */
  activity?: string;
  
  /** Required language filter */
  language?: string;
  
  /** Exact city filter - case-insensitive exact match on location field. Can be used together with location parameter. */
  city?: string;
}

/**
 * Parse URL search parameters into canonical JobSearchParams object
 * 
 * @param searchParams - URLSearchParams object from Next.js useSearchParams() or URL.searchParams
 * @returns JobSearchParams object with decoded values
 */
export function parseJobSearchParams(searchParams: URLSearchParams | ReadonlyURLSearchParams): JobSearchParams {
  const params: JobSearchParams = {};
  
  const keyword = searchParams.get('keyword');
  if (keyword) params.keyword = decodeURIComponent(keyword);
  
  const location = searchParams.get('location');
  if (location) params.location = decodeURIComponent(location);
  
  const country = searchParams.get('country');
  if (country) params.country = decodeURIComponent(country);
  
  const category = searchParams.get('category');
  if (category) params.category = decodeURIComponent(category);
  
  const activity = searchParams.get('activity');
  if (activity) params.activity = decodeURIComponent(activity);
  
  const language = searchParams.get('language');
  if (language) params.language = decodeURIComponent(language);
  
  const city = searchParams.get('city');
  if (city) params.city = decodeURIComponent(city);
  
  return params;
}

/**
 * Build URL query string from JobSearchParams object
 * 
 * @param params - JobSearchParams object
 * @returns URL query string (without leading '?')
 */
export function buildJobSearchQuery(params: JobSearchParams): string {
  const queryParts: string[] = [];
  
  if (params.keyword) {
    queryParts.push(`keyword=${encodeURIComponent(params.keyword)}`);
  }
  
  if (params.location) {
    queryParts.push(`location=${encodeURIComponent(params.location)}`);
  }
  
  if (params.country) {
    queryParts.push(`country=${encodeURIComponent(params.country)}`);
  }
  
  if (params.category) {
    queryParts.push(`category=${encodeURIComponent(params.category)}`);
  }
  
  if (params.activity) {
    queryParts.push(`activity=${encodeURIComponent(params.activity)}`);
  }
  
  if (params.language) {
    queryParts.push(`language=${encodeURIComponent(params.language)}`);
  }
  
  if (params.city) {
    queryParts.push(`city=${encodeURIComponent(params.city)}`);
  }
  
  return queryParts.join('&');
}

/**
 * Convert JobSearchParams to URL object with query string
 * 
 * @param baseUrl - Base URL (default: '/jobs')
 * @param params - JobSearchParams object
 * @returns URL string with query parameters
 */
export function buildJobSearchUrl(baseUrl: string = '/jobs', params: JobSearchParams): string {
  const queryString = buildJobSearchQuery(params);
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Check if JobSearchParams object has any active filters
 * 
 * @param params - JobSearchParams object
 * @returns true if at least one filter is set
 */
export function hasActiveFilters(params: JobSearchParams): boolean {
  return !!(params.keyword || params.location || params.country || params.category || params.activity || params.language || params.city);
}

/**
 * Clear all filters from JobSearchParams
 * 
 * @returns Empty JobSearchParams object
 */
export function clearJobSearchParams(): JobSearchParams {
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

