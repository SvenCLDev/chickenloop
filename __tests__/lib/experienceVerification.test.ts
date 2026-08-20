import {
  countUnverifiedCompleteExperienceEntries,
  experienceEndBeforeStart,
  getExperienceDateRangeError,
  getExperienceDateRangeErrorsByIndex,
  isCompleteExperienceEntry,
} from '@/lib/talentNetwork/experienceVerification';
import type { SeasonalExperienceFormEntry } from '@/app/components/talentNetwork/formTypes';

function entry(overrides: Partial<SeasonalExperienceFormEntry> = {}): SeasonalExperienceFormEntry {
  return {
    clientId: '1',
    schoolName: 'Aquasail India',
    role: 'Instructor',
    seasonTag: '',
    startMonth: 6,
    startYear: 2013,
    endMonth: '',
    endYear: '',
    referenceName: '',
    referenceEmail: '',
    referencePhone: '',
    verificationStatus: 'self_reported',
    ...overrides,
  };
}

describe('experienceVerification', () => {
  describe('isCompleteExperienceEntry', () => {
    it('returns true when required fields are filled', () => {
      expect(isCompleteExperienceEntry(entry())).toBe(true);
    });

    it('returns false when school name is missing', () => {
      expect(isCompleteExperienceEntry(entry({ schoolName: '' }))).toBe(false);
    });

    it('returns false when start date is missing', () => {
      expect(isCompleteExperienceEntry(entry({ startMonth: '' as unknown as number }))).toBe(false);
    });
  });

  describe('countUnverifiedCompleteExperienceEntries', () => {
    it('counts complete entries without manager email', () => {
      expect(
        countUnverifiedCompleteExperienceEntries([
          entry(),
          entry({ clientId: '2', referenceEmail: 'manager@example.com' }),
          entry({ clientId: '3', schoolName: '' }),
        ])
      ).toBe(1);
    });

    it('returns 0 when all complete entries have manager email', () => {
      expect(
        countUnverifiedCompleteExperienceEntries([
          entry({ referenceEmail: 'manager@example.com' }),
        ])
      ).toBe(0);
    });
  });

  describe('experienceEndBeforeStart', () => {
    it('returns false when end date is missing', () => {
      expect(experienceEndBeforeStart(entry())).toBe(false);
    });

    it('returns false when end date is on or after start date', () => {
      expect(
        experienceEndBeforeStart(
          entry({ startMonth: 5, startYear: 2024, endMonth: 10, endYear: 2024 })
        )
      ).toBe(false);
      expect(
        experienceEndBeforeStart(
          entry({ startMonth: 5, startYear: 2024, endMonth: 5, endYear: 2024 })
        )
      ).toBe(false);
    });

    it('returns true when end date is before start date', () => {
      expect(
        experienceEndBeforeStart(
          entry({ startMonth: 10, startYear: 2024, endMonth: 5, endYear: 2024 })
        )
      ).toBe(true);
      expect(
        experienceEndBeforeStart(
          entry({ startMonth: 5, startYear: 2024, endMonth: 12, endYear: 2023 })
        )
      ).toBe(true);
    });
  });

  describe('getExperienceDateRangeError', () => {
    it('returns an error message for invalid date ranges', () => {
      expect(
        getExperienceDateRangeError([
          entry({ startMonth: 10, startYear: 2024, endMonth: 5, endYear: 2024 }),
        ])
      ).toContain('End date must be on or after the start date');
    });

    it('returns null when date ranges are valid', () => {
      expect(
        getExperienceDateRangeError([
          entry({ startMonth: 5, startYear: 2024, endMonth: 10, endYear: 2024 }),
        ])
      ).toBeNull();
    });
  });

  describe('getExperienceDateRangeErrorsByIndex', () => {
    it('maps invalid entries to inline error messages', () => {
      expect(
        getExperienceDateRangeErrorsByIndex([
          entry({ startMonth: 5, startYear: 2024, endMonth: 10, endYear: 2024 }),
          entry({ clientId: '2', startMonth: 10, startYear: 2024, endMonth: 5, endYear: 2024 }),
        ])
      ).toEqual({
        1: 'End date must be on or after the start date.',
      });
    });
  });
});
