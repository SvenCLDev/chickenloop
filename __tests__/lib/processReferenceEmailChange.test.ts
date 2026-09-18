/**
 * @jest-environment node
 */
import mongoose from 'mongoose';

jest.mock('@/lib/email/sendReferenceVerificationEmail', () => ({
  sendReferenceVerificationEmail: jest.fn(),
}));

jest.mock('@/models/ReferenceVerificationToken', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

import { processReferenceVerificationRequests } from '@/lib/talentNetwork/processReferenceRequests';
import { sendReferenceVerificationEmail } from '@/lib/email/sendReferenceVerificationEmail';
import ReferenceVerificationToken from '@/models/ReferenceVerificationToken';

describe('processReferenceVerificationRequests email change', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('bypasses cooldown and invalidates token when manager email changes', async () => {
    const entryId = new mongoose.Types.ObjectId();
    const oldTokenId = new mongoose.Types.ObjectId();
    const newTokenId = new mongoose.Types.ObjectId();

    (ReferenceVerificationToken.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        managerEmail: 'old@school.com',
      }),
    });
    (ReferenceVerificationToken.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
    (ReferenceVerificationToken.findOne as jest.Mock).mockResolvedValue(null);
    (ReferenceVerificationToken.create as jest.Mock).mockResolvedValue({
      _id: newTokenId,
      token: 'new-token',
      save: jest.fn(),
    });
    (sendReferenceVerificationEmail as jest.Mock).mockResolvedValue({
      success: true,
      messageId: 'msg_1',
    });

    const cv = {
      _id: new mongoose.Types.ObjectId(),
      fullName: 'Tester',
      seasonalExperience: [
        {
          _id: entryId,
          schoolName: 'Balls',
          role: 'Instructor',
          startMonth: 6,
          startYear: 2024,
          referenceEmail: 'new@school.com',
          verificationStatus: 'reference_requested',
          referenceTokenId: oldTokenId,
          lastReferenceEmailSentAt: new Date(), // within 24h cooldown
        },
      ],
      markModified: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };

    await processReferenceVerificationRequests(cv as never);

    expect(ReferenceVerificationToken.findByIdAndUpdate).toHaveBeenCalledWith(
      oldTokenId,
      expect.objectContaining({ $set: expect.objectContaining({ expiresAt: expect.any(Date) }) })
    );
    expect(sendReferenceVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        managerEmail: 'new@school.com',
        token: 'new-token',
      })
    );
    expect(cv.seasonalExperience[0].verificationStatus).toBe('reference_requested');
    expect(cv.save).toHaveBeenCalled();
  });

  it('respects cooldown when email is unchanged', async () => {
    const entryId = new mongoose.Types.ObjectId();
    const tokenId = new mongoose.Types.ObjectId();

    (ReferenceVerificationToken.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        managerEmail: 'same@school.com',
      }),
    });

    const cv = {
      _id: new mongoose.Types.ObjectId(),
      fullName: 'Tester',
      seasonalExperience: [
        {
          _id: entryId,
          schoolName: 'Balls',
          role: 'Instructor',
          startMonth: 6,
          startYear: 2024,
          referenceEmail: 'same@school.com',
          verificationStatus: 'reference_requested',
          referenceTokenId: tokenId,
          lastReferenceEmailSentAt: new Date(),
        },
      ],
      markModified: jest.fn(),
      save: jest.fn(),
    };

    await processReferenceVerificationRequests(cv as never);

    expect(sendReferenceVerificationEmail).not.toHaveBeenCalled();
    expect(cv.save).not.toHaveBeenCalled();
  });
});
