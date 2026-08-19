import {
  countUnverifiedCompleteExperienceEntries,
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
});
