import { canSendManagerReminder } from '@/lib/talentNetwork/referenceReminderEligibility';
import {
  REFERENCE_AUTO_REMIND_AFTER_MS,
  REFERENCE_MANUAL_REMIND_AFTER_MS,
} from '@/lib/talentNetwork/referenceFollowupConstants';

describe('canSendManagerReminder', () => {
  const baseToken = {
    expiresAt: new Date('2026-10-01T00:00:00.000Z'),
    reminderCount: 0,
  };
  const sentAt = new Date('2026-09-01T00:00:00.000Z');

  it('allows auto reminder after 5 days', () => {
    const now = new Date(sentAt.getTime() + REFERENCE_AUTO_REMIND_AFTER_MS);
    expect(
      canSendManagerReminder(baseToken, sentAt, { mode: 'auto', now })
    ).toEqual({ ok: true });
  });

  it('blocks auto reminder before 5 days', () => {
    const now = new Date(sentAt.getTime() + REFERENCE_AUTO_REMIND_AFTER_MS - 1000);
    expect(
      canSendManagerReminder(baseToken, sentAt, { mode: 'auto', now })
    ).toEqual({ ok: false, reason: 'too_soon' });
  });

  it('allows manual reminder after 3 days', () => {
    const now = new Date(sentAt.getTime() + REFERENCE_MANUAL_REMIND_AFTER_MS);
    expect(
      canSendManagerReminder(baseToken, sentAt, { mode: 'manual', now })
    ).toEqual({ ok: true });
  });

  it('blocks when already reminded', () => {
    const now = new Date(sentAt.getTime() + REFERENCE_AUTO_REMIND_AFTER_MS);
    expect(
      canSendManagerReminder(
        { ...baseToken, reminderSentAt: now, reminderCount: 1 },
        sentAt,
        { mode: 'auto', now }
      )
    ).toEqual({ ok: false, reason: 'already_reminded' });
  });

  it('blocks expired tokens', () => {
    const now = new Date('2026-10-02T00:00:00.000Z');
    expect(
      canSendManagerReminder(
        { ...baseToken, expiresAt: new Date('2026-10-01T00:00:00.000Z') },
        sentAt,
        { mode: 'manual', now }
      )
    ).toEqual({ ok: false, reason: 'expired' });
  });
});
