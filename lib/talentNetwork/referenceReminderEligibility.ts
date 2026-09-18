import {
  REFERENCE_AUTO_REMIND_AFTER_MS,
  REFERENCE_MANUAL_REMIND_AFTER_MS,
  REFERENCE_MAX_REMINDERS,
} from '@/lib/talentNetwork/referenceFollowupConstants';

export type ReminderEligibility =
  | { ok: true }
  | { ok: false; reason: string };

export function canSendManagerReminder(
  tokenDoc: {
    reminderSentAt?: Date | null;
    reminderCount?: number | null;
    respondedAt?: Date | null;
    expiresAt: Date;
    bouncedAt?: Date | null;
  },
  lastReferenceEmailSentAt: Date | string | undefined,
  options: { mode: 'auto' | 'manual'; now?: Date }
): ReminderEligibility {
  const now = options.now ?? new Date();
  if (tokenDoc.respondedAt) {
    return { ok: false, reason: 'already_responded' };
  }
  if (tokenDoc.bouncedAt) {
    return { ok: false, reason: 'bounced' };
  }
  if (tokenDoc.expiresAt <= now) {
    return { ok: false, reason: 'expired' };
  }
  const count = tokenDoc.reminderCount ?? 0;
  if (tokenDoc.reminderSentAt || count >= REFERENCE_MAX_REMINDERS) {
    return { ok: false, reason: 'already_reminded' };
  }
  if (!lastReferenceEmailSentAt) {
    return { ok: false, reason: 'never_sent' };
  }
  const sentAt = new Date(lastReferenceEmailSentAt).getTime();
  const minWait =
    options.mode === 'auto'
      ? REFERENCE_AUTO_REMIND_AFTER_MS
      : REFERENCE_MANUAL_REMIND_AFTER_MS;
  if (now.getTime() - sentAt < minWait) {
    return { ok: false, reason: 'too_soon' };
  }
  return { ok: true };
}
