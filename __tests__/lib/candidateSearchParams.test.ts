import {
  DEFAULT_CANDIDATE_SORT,
  normalizeCandidateSortKey,
  parseCandidateSearchParams,
} from '@/lib/candidateSearchParams';

describe('normalizeCandidateSortKey', () => {
  it('defaults empty sort to last_active', () => {
    expect(normalizeCandidateSortKey()).toBe(DEFAULT_CANDIDATE_SORT);
    expect(normalizeCandidateSortKey('')).toBe(DEFAULT_CANDIDATE_SORT);
  });

  it('maps legacy newest URL param to updated', () => {
    expect(normalizeCandidateSortKey('newest')).toBe('updated');
  });

  it('passes through known sort keys', () => {
    expect(normalizeCandidateSortKey('last_active')).toBe('last_active');
    expect(normalizeCandidateSortKey('updated')).toBe('updated');
    expect(normalizeCandidateSortKey('created')).toBe('created');
    expect(normalizeCandidateSortKey('oldest')).toBe('oldest');
  });

  it('falls back unknown sort keys to last_active', () => {
    expect(normalizeCandidateSortKey('invalid')).toBe(DEFAULT_CANDIDATE_SORT);
  });
});

describe('parseCandidateSearchParams sort', () => {
  it('normalizes legacy sort=newest from URL', () => {
    const params = parseCandidateSearchParams(new URLSearchParams('sort=newest'));
    expect(params.sort).toBe('updated');
  });

  it('omits sort when not present (caller applies default)', () => {
    const params = parseCandidateSearchParams(new URLSearchParams(''));
    expect(params.sort).toBeUndefined();
  });
});
