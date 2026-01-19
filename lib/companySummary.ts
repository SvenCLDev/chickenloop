/**
 * Company Summary Generator
 * 
 * Generates a concise, neutral, informational company summary (max 500 characters)
 * derived from existing Company model fields. Used for display on Job Details pages.
 * 
 * This is a computed value - NOT stored in the database.
 * Summary is generated on-demand from available company data.
 */

import { stripHtmlToText } from './sanitizeText';
import { getCountryNameFromCode } from './countryUtils';

/**
 * Company data interface for summary generation
 * Matches the structure available from populated Company documents
 */
export interface CompanySummaryInput {
  name?: string;
  description?: string;
  address?: {
    city?: string;
    country?: string;
  };
  offeredActivities?: string[];
  offeredServices?: string[];
}

/**
 * Generate a short, neutral company summary from available company data
 * 
 * @param company - Company data (may be partial/populated)
 * @returns Plain text summary (max 500 characters), never empty
 * 
 * @example
 * generateCompanySummary({
 *   name: "Tarifa Kitesurf School",
 *   address: { city: "Tarifa", country: "ES" },
 *   offeredActivities: ["Kitesurfing", "Windsurfing"]
 * })
 * // Returns: "Kitesurfing and windsurfing school based in Tarifa, Spain."
 */
export function generateCompanySummary(company: CompanySummaryInput | null | undefined): string {
  // Fallback if no company data
  if (!company) {
    return 'Outdoor sports employer.';
  }

  const parts: string[] = [];

  // 1. Determine company type from activities/services (preferred)
  const activities = company.offeredActivities || [];
  const services = company.offeredServices || [];
  const allOfferings = [...activities, ...services].filter(Boolean);

  // Infer company type from activities/services
  let companyType = '';
  if (allOfferings.length > 0) {
    // Use first activity/service to infer type
    const primaryOffering = allOfferings[0].toLowerCase();
    
    // Common patterns for company type inference
    if (primaryOffering.includes('kitesurf')) {
      companyType = 'kitesurf school';
    } else if (primaryOffering.includes('windsurf')) {
      companyType = 'windsurf school';
    } else if (primaryOffering.includes('surf') && !primaryOffering.includes('kitesurf') && !primaryOffering.includes('windsurf')) {
      companyType = 'surf school';
    } else if (primaryOffering.includes('sailing')) {
      companyType = 'sailing school';
    } else if (primaryOffering.includes('diving') || primaryOffering.includes('dive')) {
      companyType = 'diving center';
    } else if (primaryOffering.includes('resort')) {
      companyType = 'resort';
    } else if (primaryOffering.includes('center') || primaryOffering.includes('centre')) {
      companyType = 'watersports center';
    } else {
      // Generic type based on first offering
      companyType = 'watersports center';
    }
  } else {
    // No activities/services, use generic type
    companyType = 'outdoor sports employer';
  }

  // 2. Add location (city and/or country)
  const city = company.address?.city;
  const countryCode = company.address?.country;
  const countryName = countryCode ? getCountryNameFromCode(countryCode) : null;

  const locationParts: string[] = [];
  if (city) {
    locationParts.push(city);
  }
  if (countryName) {
    locationParts.push(countryName);
  }
  const location = locationParts.length > 0 ? locationParts.join(', ') : '';

  // 3. Build summary parts
  if (companyType && location) {
    parts.push(`${companyType} based in ${location}`);
  } else if (companyType) {
    parts.push(companyType);
  } else if (location) {
    parts.push(`outdoor sports employer in ${location}`);
  }

  // 4. Add offerings if space allows (up to 2-3 activities)
  if (allOfferings.length > 0 && parts.length > 0) {
    const offeringsToShow = allOfferings.slice(0, 2);
    const offeringsText = offeringsToShow.join(' and ').toLowerCase();
    const offeringsPhrase = `offering ${offeringsText}`;
    
    // Check if we can add offerings without exceeding limit
    const currentText = parts.join(' ');
    const withOfferings = `${currentText} ${offeringsPhrase}.`;
    
    if (withOfferings.length <= 500) {
      parts.push(offeringsPhrase);
    }
  }

  // 5. Build final summary
  let summary = parts.join(' ');
  
  // Ensure it ends with a period
  if (summary && !summary.endsWith('.')) {
    summary += '.';
  }

  // 6. Sanitize: strip HTML, collapse whitespace
  summary = stripHtmlToText(summary);
  summary = summary.replace(/\s+/g, ' ').trim();

  // 7. Truncate at word boundary if exceeds 500 characters
  const MAX_LENGTH = 500;
  if (summary.length > MAX_LENGTH) {
    // Find last space before the limit
    const truncated = summary.substring(0, MAX_LENGTH);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > MAX_LENGTH * 0.7) {
      // Use word boundary if it's not too early
      summary = truncated.substring(0, lastSpace).trim();
    } else {
      // Otherwise truncate at character boundary
      summary = truncated.trim();
    }
    
    // Ensure it ends with period (may have been cut off)
    if (!summary.endsWith('.')) {
      summary += '.';
    }
  }

  // 8. Final fallback - never return empty string
  if (!summary || summary.trim().length === 0) {
    return 'Outdoor sports employer.';
  }

  return summary;
}
