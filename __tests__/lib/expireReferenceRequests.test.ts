/**
 * @jest-environment node
 */

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/models/CV', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock('@/models/ReferenceVerificationToken', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}));

import mongoose from 'mongoose';
import CV from '@/models/CV';
import ReferenceVerificationToken from '@/models/ReferenceVerificationToken';
import { expireStaleReferenceRequests } from '@/lib/talentNetwork/referenceFollowup';

describe('expireStaleReferenceRequests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks reference_requested experiences as reference_expired', async () => {
    const tokenId = new mongoose.Types.ObjectId();
    const entryId = new mongoose.Types.ObjectId();
    const cvId = new mongoose.Types.ObjectId();
    const now = new Date('2026-09-20T00:00:00.000Z');

    (ReferenceVerificationToken.find as jest.Mock).mockResolvedValue([
      {
        _id: tokenId,
        cvId,
        experienceEntryId: String(entryId),
        schoolName: 'Balls',
        managerEmail: 'mgr@school.com',
        expiresAt: new Date('2026-09-19T00:00:00.000Z'),
      },
    ]);

    const entry = {
      _id: entryId,
      schoolName: 'Balls',
      verificationStatus: 'reference_requested',
      referenceTokenId: tokenId,
      referenceEmail: 'mgr@school.com',
    };
    const cv = {
      seasonalExperience: [entry],
      markModified: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    (CV.findById as jest.Mock).mockResolvedValue(cv);

    const result = await expireStaleReferenceRequests(now);

    expect(result.expired).toBe(1);
    expect(entry.verificationStatus).toBe('reference_expired');
    expect(cv.save).toHaveBeenCalled();
  });
});
