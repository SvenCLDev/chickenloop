/**
 * Company profile completeness checks.
 */

export function isCompanyProfileComplete(company: any): boolean {
  return getCompanyProfileIncompleteReason(company) === null;
}

/** Returns a human-readable reason if incomplete, or null if complete. */
export function getCompanyProfileIncompleteReason(company: any): string | null {
  if (company == null) return 'Company not found';

  const description = typeof company.description === 'string' ? company.description.trim() : '';
  if (!description || description.length < 50) {
    return 'Company description must be at least 50 characters';
  }

  const city = company.address?.city;
  if (!city || (typeof city === 'string' && !city.trim())) {
    return 'Company city is required';
  }

  const country = company.address?.country;
  if (!country || (typeof country === 'string' && !country.trim())) {
    return 'Company country is required';
  }

  return null;
}
