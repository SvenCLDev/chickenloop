import mongoose from 'mongoose';
import ReferenceVerificationToken from '@/models/ReferenceVerificationToken';
import CV from '@/models/CV';
import {
  confirmReferenceToken,
  EXPERIENCE_REMOVED_ERROR,
  getReferenceConfirmContext,
} from '@/lib/talentNetwork/processReferenceRequests';

jest.mock('@/models/ReferenceVerificationToken', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

jest.mock('@/models/CV', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

const mockFindToken = ReferenceVerificationToken.findOne as jest.Mock;
const mockFindCv = CV.findById as jest.Mock;

function futureDate(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

function baseToken(overrides: Record<string, unknown> = {}) {
  const tokenId = new mongoose.Types.ObjectId();
  const cvId = new mongoose.Types.ObjectId();
  const entryId = new mongoose.Types.ObjectId();
  return {
    _id: tokenId,
    cvId,
    experienceEntryId: String(entryId),
    managerEmail: 'manager@example.com',
    token: 'abc123',
    candidateName: 'Sven Kelling',
    schoolName: 'Malle Surf Fun',
    seasonLabel: '3/2026 – 8/2026',
    expiresAt: futureDate(),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('getReferenceConfirmContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns error when token is invalid', async () => {
    mockFindToken.mockResolvedValue(null);
    const result = await getReferenceConfirmContext('missing');
    expect(result).toEqual({
      status: 'error',
      error: 'Invalid reference link',
      httpStatus: 404,
    });
  });

  it('returns error when token is expired', async () => {
    mockFindToken.mockResolvedValue(
      baseToken({ expiresAt: new Date(Date.now() - 1000) })
    );
    const result = await getReferenceConfirmContext('expired');
    expect(result).toEqual({
      status: 'error',
      error: 'Reference link expired',
      httpStatus: 410,
    });
  });

  it('returns responded state without checking CV entry', async () => {
    mockFindToken.mockResolvedValue(
      baseToken({
        respondedAt: new Date(),
        confirmed: true,
        rehire: true,
      })
    );

    const result = await getReferenceConfirmContext('responded');
    expect(result).toEqual({
      status: 'responded',
      candidateName: 'Sven Kelling',
      schoolName: 'Malle Surf Fun',
      seasonLabel: '3/2026 – 8/2026',
      worked: true,
      rehire: true,
    });
    expect(mockFindCv).not.toHaveBeenCalled();
  });

  it('returns entry_removed when CV has no matching experience', async () => {
    const tokenDoc = baseToken();
    mockFindToken.mockResolvedValue(tokenDoc);
    mockFindCv.mockResolvedValue({
      seasonalExperience: [],
    });

    const result = await getReferenceConfirmContext('removed');
    expect(result).toEqual({
      status: 'entry_removed',
      candidateName: 'Sven Kelling',
      schoolName: 'Malle Surf Fun',
      seasonLabel: '3/2026 – 8/2026',
    });
  });

  it('returns pending when matching experience exists', async () => {
    const tokenDoc = baseToken();
    const entryId = tokenDoc.experienceEntryId;
    mockFindToken.mockResolvedValue(tokenDoc);
    mockFindCv.mockResolvedValue({
      seasonalExperience: [
        {
          _id: new mongoose.Types.ObjectId(entryId),
          schoolName: 'Malle Surf Fun',
          role: 'Instructor',
          startMonth: 3,
          startYear: 2026,
          verificationStatus: 'reference_requested',
          referenceEmail: 'manager@example.com',
        },
      ],
      markModified: jest.fn(),
      save: jest.fn(),
    });

    const result = await getReferenceConfirmContext('pending');
    expect(result.status).toBe('pending');
    if (result.status === 'pending') {
      expect(result.candidateName).toBe('Sven Kelling');
      expect(result.entry.schoolName).toBe('Malle Surf Fun');
    }
  });
});

describe('confirmReferenceToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns experience_removed when entry was deleted', async () => {
    const tokenDoc = baseToken();
    mockFindToken.mockResolvedValue(tokenDoc);
    mockFindCv.mockResolvedValue({ seasonalExperience: [] });

    const result = await confirmReferenceToken('removed', { worked: true, rehire: true });
    expect(result).toEqual({
      ok: false,
      error: EXPERIENCE_REMOVED_ERROR,
      code: 'experience_removed',
    });
  });

  it('confirms reference when entry exists', async () => {
    const tokenDoc = baseToken();
    const entry = {
      _id: new mongoose.Types.ObjectId(tokenDoc.experienceEntryId),
      schoolName: 'Malle Surf Fun',
      role: 'Instructor',
      startMonth: 3,
      startYear: 2026,
      verificationStatus: 'reference_requested',
      referenceEmail: 'manager@example.com',
    };
    const cv = {
      seasonalExperience: [entry],
      markModified: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockFindToken.mockResolvedValue(tokenDoc);
    mockFindCv.mockResolvedValue(cv);

    const result = await confirmReferenceToken('pending', { worked: true, rehire: true });
    expect(result).toEqual({
      ok: true,
      candidateName: 'Sven Kelling',
      worked: true,
      rehire: true,
    });
    expect(entry.verificationStatus).toBe('reference_confirmed');
    expect(tokenDoc.save).toHaveBeenCalled();
    expect(cv.save).toHaveBeenCalled();
  });
});
