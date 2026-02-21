/**
 * Company URL slug helpers
 * URL format: /company/[country-slug]/[company-name-slug]
 * Example: /company/greece/blue-zone-sardinia
 */

import { generateSlug, generateCountrySlug, getCountryValuesForSlug } from './jobSlug';

export interface CompanyForUrl {
  id?: string;
  _id?: string;
  name: string;
  address?: { country?: string | null } | null;
}

/**
 * Build the canonical company URL path from company data.
 * Uses address.country for country slug when available.
 */
export function getCompanyUrl(company: CompanyForUrl): string {
  const country =
    company.address?.country != null && String(company.address.country).trim()
      ? company.address.country
      : undefined;
  const countrySlug = generateCountrySlug(country ?? null);
  const nameSlug = generateSlug(company.name) || 'company';
  return `/company/${countrySlug}/${nameSlug}`;
}

/**
 * Resolve country slug to values usable in a MongoDB query (e.g. country codes).
 */
export function getCountryValuesForCompanySlug(countrySlug: string): (string | null)[] {
  return getCountryValuesForSlug(countrySlug) as (string | null)[];
}

/**
 * Check if a company's name slug and country match the given params.
 */
export function companyMatchesSlug(
  company: { name: string; address?: { country?: string | null } | null },
  countrySlug: string,
  nameSlug: string
): boolean {
  if ((generateSlug(company.name) || 'company') !== nameSlug) return false;
  const country = company.address?.country != null && String(company.address.country).trim()
    ? company.address.country
    : null;
  const companyCountrySlug = generateCountrySlug(country);
  return companyCountrySlug === countrySlug;
}

export { generateSlug as generateCompanyNameSlug, generateCountrySlug };
