import mongoose from 'mongoose';
import {
  findSeasonalExperienceForToken,
  isMongoObjectId,
  mergeSeasonalExperienceForSave,
} from '@/lib/talentNetwork/mergeSeasonalExperience';

describe('mergeSeasonalExperienceForSave', () => {
  it('preserves subdocument _id from explicit _id on update', () => {
    const existingId = new mongoose.Types.ObjectId();
    const existing = [
      {
        _id: existingId,
        schoolName: 'Aquasail India',
        role: 'Instructor',
        startMonth: 6,
        startYear: 2013,
        verificationStatus: 'reference_requested' as const,
        referenceEmail: 'manager@example.com',
      },
    ];

    const merged = mergeSeasonalExperienceForSave(existing, [
      {
        _id: existingId,
        schoolName: 'Aquasail India',
        role: 'Instructor',
        startMonth: 6,
        startYear: 2013,
        seasonTag: 'summer 2013',
        referenceEmail: 'manager@example.com',
        verificationStatus: 'reference_requested',
      },
    ]);

    expect(String(merged[0]._id)).toBe(String(existingId));
    expect(merged[0].verificationStatus).toBe('reference_requested');
  });

  it('matches existing entry by fingerprint when _id omitted', () => {
    const existingId = new mongoose.Types.ObjectId();
    const existing = [
      {
        _id: existingId,
        schoolName: 'Aquasail India',
        role: 'Instructor',
        startMonth: 6,
        startYear: 2013,
        verificationStatus: 'reference_requested' as const,
      },
    ];

    const merged = mergeSeasonalExperienceForSave(existing, [
      {
        schoolName: 'Aquasail India',
        role: 'Instructor',
        startMonth: 6,
        startYear: 2013,
        verificationStatus: 'self_reported',
      },
    ]);

    expect(String(merged[0]._id)).toBe(String(existingId));
    expect(merged[0].verificationStatus).toBe('self_reported');
  });

  it('assigns a new ObjectId for brand-new entries without fingerprint match', () => {
    const merged = mergeSeasonalExperienceForSave(undefined, [
      {
        schoolName: 'New School',
        role: 'Instructor',
        startMonth: 7,
        startYear: 2024,
        referenceEmail: 'manager@example.com',
        verificationStatus: 'self_reported',
      },
    ]);

    expect(merged[0]._id).toBeDefined();
    expect(isMongoObjectId(String(merged[0]._id))).toBe(true);
  });
});

describe('findSeasonalExperienceForToken', () => {
  it('finds entry by stale token id using school and manager email fallback', () => {
    const tokenId = new mongoose.Types.ObjectId();
    const newEntryId = new mongoose.Types.ObjectId();
    const entries = [
      {
        _id: newEntryId,
        schoolName: 'Aquasail India',
        role: 'Instructor',
        startMonth: 6,
        startYear: 2013,
        verificationStatus: 'reference_requested' as const,
        referenceEmail: 'manager@example.com',
      },
    ];

    const match = findSeasonalExperienceForToken(entries, {
      _id: tokenId,
      experienceEntryId: new mongoose.Types.ObjectId().toString(),
      schoolName: 'Aquasail India',
      managerEmail: 'manager@example.com',
      seasonLabel: 'summer 2013',
    });

    expect(match?.schoolName).toBe('Aquasail India');
  });
});

describe('isMongoObjectId', () => {
  it('accepts 24-char hex ids from clientId', () => {
    expect(isMongoObjectId('507f1f77bcf86cd799439011')).toBe(true);
    expect(isMongoObjectId('exp-0')).toBe(false);
  });
});
