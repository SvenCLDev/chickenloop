import {
  computeCanWorkWithoutSponsorshipIn,
  computeWorkEligibleCountries,
  isValidCountryCode,
  mergeEligibleCountries,
  normalizeCountryCodeList,
  validateWorkAuthorization,
} from '@/lib/workLocation';

describe('workLocation', () => {
  it('validates ISO country codes', () => {
    expect(isValidCountryCode('ES')).toBe(true);
    expect(isValidCountryCode('es')).toBe(true);
    expect(isValidCountryCode('XX')).toBe(false);
  });

  it('normalizes country code lists uniquely', () => {
    expect(normalizeCountryCodeList(['es', 'ES', 'PT', 'invalid'])).toEqual(['ES', 'PT']);
  });

  it('merges EU/EEA/CH when flag is set', () => {
    const merged = mergeEligibleCountries(['ES'], true);
    expect(merged).toContain('ES');
    expect(merged).toContain('DE');
    expect(merged).toContain('CH');
  });

  it('defaults eligible countries to nationality when empty', () => {
    const result = computeWorkEligibleCountries([], undefined, 'DE', false);
    expect(result).toEqual(['DE']);
  });

  it('computes can work without sponsorship from authorizations', () => {
    const result = computeCanWorkWithoutSponsorshipIn([
      { country: 'ES', status: 'citizen' },
      { country: 'US', status: 'requires_sponsorship' },
    ]);
    expect(result).toEqual(['ES']);
  });

  it('validates work authorization entries', () => {
    const parsed = validateWorkAuthorization({
      country: 'AU',
      status: 'working_holiday',
      permitType: 'WHV',
    });
    expect(parsed.ok).toBe(true);
  });
});
