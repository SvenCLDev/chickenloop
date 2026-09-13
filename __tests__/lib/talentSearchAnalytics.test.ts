import {
  getActiveFilterKeys,
  labelForFilterKey,
  listEventForPage,
  snapshotCandidateFilters,
} from '@/lib/talentSearchAnalytics';

describe('talentSearchAnalytics helpers', () => {
  it('classifies page 1 as talent_search and later pages as talent_search_page', () => {
    expect(listEventForPage(1)).toBe('talent_search');
    expect(listEventForPage(undefined)).toBe('talent_search');
    expect(listEventForPage(2)).toBe('talent_search_page');
  });

  it('snapshots only non-empty filters and omits default sort', () => {
    expect(
      snapshotCandidateFilters({
        kw: 'kitesurf',
        workArea: ['Instruction'],
        sort: 'last_active',
        page: 1,
        verifiedOnly: false,
      })
    ).toEqual({
      kw: 'kitesurf',
      workArea: ['Instruction'],
    });

    expect(
      snapshotCandidateFilters({
        page: 3,
        sort: 'updated',
      })
    ).toEqual({
      sort: 'updated',
      page: 3,
    });
  });

  it('lists active filter keys without pagination', () => {
    expect(
      getActiveFilterKeys({
        kw: 'RYA',
        sport: ['kitesurfing'],
        page: 2,
        sort: 'last_active',
      })
    ).toEqual(['kw', 'sport']);
  });

  it('labels known filter keys', () => {
    expect(labelForFilterKey('verifiedOnly')).toBe('Verified only');
    expect(labelForFilterKey('custom')).toBe('custom');
  });
});
