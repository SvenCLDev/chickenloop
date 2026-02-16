/**
 * Company profile completeness checks.
 */

export function isCompanyProfileComplete(company: any): boolean {
  if (company == null) return false;

  const description = typeof company.description === 'string' ? company.description.trim() : '';
  if (!description || description.length < 50) return false;

  const city = company.address?.city;
  if (!city || (typeof city === 'string' && !city.trim())) return false;

  const country = company.address?.country;
  if (!country || (typeof country === 'string' && !country.trim())) return false;

  return true;
}
