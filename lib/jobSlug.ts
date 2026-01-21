/**
 * Utility functions for generating SEO-friendly slugs for job URLs
 * 
 * URL format: /job/{country-slug}/{job-slug}
 * Example: /job/greece/kitesurf-windsurf-wing-instructors-kos-island
 */

import { getCountryNameFromCode } from './countryUtils';

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
 * Generate a job slug from job title
 * 
 * @param title - Job title
 * @returns Job slug
 */
export function generateJobSlug(title: string): string {
  return generateSlug(title);
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
 * Generate the full canonical job URL path
 * 
 * Format: /job/{country-slug}/{job-slug}
 * 
 * @param jobTitle - Job title
 * @param country - Country code or name
 * @returns Canonical job URL path
 */
export function generateJobUrlPath(jobTitle: string, country?: string | null): string {
  const jobSlug = generateJobSlug(jobTitle);
  const countrySlug = generateCountrySlug(country);
  
  return `/job/${countrySlug}/${jobSlug}`;
}

/**
 * Get the canonical URL for a job object
 * 
 * This is the main helper function to use for generating job URLs throughout the app.
 * 
 * @param job - Job object with at least `title` and optionally `country` fields
 * @returns Canonical job URL path (e.g., "/job/greece/kitesurf-instructor")
 * 
 * @example
 * ```ts
 * const job = { _id: '123', title: 'Kitesurf Instructor', country: 'GR' };
 * const url = getJobUrl(job); // "/job/greece/kitesurf-instructor"
 * ```
 */
export function getJobUrl(job: { title: string; country?: string | null }): string {
  return generateJobUrlPath(job.title, job.country);
}
