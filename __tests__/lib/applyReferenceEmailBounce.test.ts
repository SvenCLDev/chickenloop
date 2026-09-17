import { applyReferenceEmailBounceToCv } from '@/lib/talentNetwork/applyReferenceEmailBounce';
import type { ICV } from '@/models/CV';
import type { IReferenceVerificationToken } from '@/models/ReferenceVerificationToken';

function makeCv(entry: Record<string, unknown>) {
  const seasonalExperience = [
    {
      _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      schoolName: 'Ion Club',
      role: 'Instructor',
      startMonth: 5,
      startYear: 2024,
      referenceEmail: 'manager@bad-domain.example',
      verificationStatus: 'reference_requested',
      lastReferenceEmailSentAt: new Date('2026-09-01T00:00:00.000Z'),
      ...entry,
    },
  ];
  return {
    seasonalExperience,
    markModified: jest.fn(),
  } as unknown as ICV & { markModified: jest.Mock };
}

function makeToken(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    experienceEntryId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    schoolName: 'Ion Club',
    managerEmail: 'manager@bad-domain.example',
    seasonLabel: 'Summer 2024',
    expiresAt: new Date('2026-12-01T00:00:00.000Z'),
    ...overrides,
  } as unknown as IReferenceVerificationToken;
}

describe('applyReferenceEmailBounceToCv', () => {
  it('marks the experience as bounced and clears send cooldown', () => {
    const cv = makeCv({});
    const token = makeToken();

    const result = applyReferenceEmailBounceToCv(cv, token, { bounceType: 'hard' });

    expect(result.status).toBe('updated');
    expect(cv.seasonalExperience?.[0].verificationStatus).toBe('reference_email_bounced');
    expect(cv.seasonalExperience?.[0].lastReferenceEmailSentAt).toBeUndefined();
    expect(token.bouncedAt).toBeInstanceOf(Date);
    expect(token.bounceType).toBe('hard');
    expect(token.expiresAt.getTime()).toBeLessThanOrEqual(Date.now());
    expect(cv.markModified).toHaveBeenCalledWith('seasonalExperience');
  });

  it('is idempotent when already bounced', () => {
    const bouncedAt = new Date('2026-09-10T00:00:00.000Z');
    const cv = makeCv({ verificationStatus: 'reference_email_bounced' });
    const token = makeToken({ bouncedAt, respondedAt: bouncedAt });

    const result = applyReferenceEmailBounceToCv(cv, token);

    expect(result).toEqual({ status: 'noop', reason: 'already_bounced' });
  });

  it('does not overwrite a confirmed reference', () => {
    const cv = makeCv({ verificationStatus: 'reference_confirmed' });
    const token = makeToken();

    const result = applyReferenceEmailBounceToCv(cv, token);

    expect(result).toEqual({ status: 'noop', reason: 'already_resolved' });
    expect(cv.seasonalExperience?.[0].verificationStatus).toBe('reference_confirmed');
  });

  it('handles missing experience entry without throwing', () => {
    const cv = makeCv({});
    cv.seasonalExperience = [];
    const token = makeToken();

    const result = applyReferenceEmailBounceToCv(cv, token, { bounceType: 'bounced' });

    expect(result.status).toBe('missing_entry');
    expect(token.bouncedAt).toBeInstanceOf(Date);
    expect(token.expiresAt.getTime()).toBeLessThanOrEqual(Date.now());
  });
});
