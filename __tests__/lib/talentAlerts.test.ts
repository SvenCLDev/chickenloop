import {
  buildDefaultTalentAlertName,
  sanitizeTalentAlertFilters,
} from '@/lib/talentAlerts/sanitizeFilters';
import { shouldNotifyAvailabilityTransition } from '@/lib/talentAlerts/favouriteAvailability';
import { groupMatchesByRecruiter } from '@/lib/talentAlerts/matchCvToSavedSearches';

describe('sanitizeTalentAlertFilters', () => {
  it('returns null when no filters are set', () => {
    expect(sanitizeTalentAlertFilters({})).toBeNull();
    expect(sanitizeTalentAlertFilters({ sort: 'last_active' })).toBeNull();
  });

  it('keeps array filters and drops empty values', () => {
    const filters = sanitizeTalentAlertFilters({
      sport: ['Kitesurf', ''],
      kw: '  instructor  ',
      verifiedOnly: true,
      page: 2,
      sort: 'updated',
    });
    expect(filters).toEqual({
      sport: ['Kitesurf'],
      kw: 'instructor',
      verifiedOnly: true,
    });
  });

  it('accepts single string values for multi fields', () => {
    const filters = sanitizeTalentAlertFilters({ availability: 'available_now' });
    expect(filters).toEqual({ availability: ['available_now'] });
  });
});

describe('buildDefaultTalentAlertName', () => {
  it('builds a readable name from primary filters', () => {
    expect(
      buildDefaultTalentAlertName({
        sport: ['Kitesurf'],
        availability: ['available_now'],
        location: 'Tarifa',
      })
    ).toBe('Kitesurf · available now · Tarifa');
  });
});

describe('shouldNotifyAvailabilityTransition', () => {
  it('notifies available_now by default', () => {
    expect(
      shouldNotifyAvailabilityTransition('not_available', 'available_now', {
        notifyWhenAvailableNow: true,
      })
    ).toBe('available_now');
  });

  it('does not notify when value is unchanged', () => {
    expect(
      shouldNotifyAvailabilityTransition('available_now', 'available_now', {
        notifyWhenAvailableNow: true,
      })
    ).toBeNull();
  });

  it('notifies available_soon only when enabled and from inactive states', () => {
    expect(
      shouldNotifyAvailabilityTransition('not_available', 'available_soon', {
        notifyWhenAvailableSoon: true,
      })
    ).toBe('available_soon');
    expect(
      shouldNotifyAvailabilityTransition('available_now', 'available_soon', {
        notifyWhenAvailableSoon: true,
      })
    ).toBeNull();
    expect(
      shouldNotifyAvailabilityTransition('not_available', 'available_soon', {
        notifyWhenAvailableSoon: false,
      })
    ).toBeNull();
  });
});

describe('groupMatchesByRecruiter', () => {
  it('combines searches and prefers immediate frequency', () => {
    const grouped = groupMatchesByRecruiter([
      {
        searchId: 'a',
        recruiterId: 'r1',
        frequency: 'daily',
        name: 'Daily kitesurf',
      },
      {
        searchId: 'b',
        recruiterId: 'r1',
        frequency: 'immediate',
        name: 'Immediate wing',
      },
      {
        searchId: 'c',
        recruiterId: 'r2',
        frequency: 'weekly',
        name: 'Weekly',
      },
    ]);

    expect(grouped.get('r1')).toEqual({
      searchIds: ['a', 'b'],
      frequencyBucket: 'immediate',
      names: ['Daily kitesurf', 'Immediate wing'],
    });
    expect(grouped.get('r2')?.frequencyBucket).toBe('weekly');
  });
});
