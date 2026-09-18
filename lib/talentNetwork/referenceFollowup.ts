import type { Document } from 'mongoose';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import CV from '@/models/CV';
import User from '@/models/User';
import type { ICV } from '@/models/CV';
import type { IReferenceVerificationToken } from '@/models/ReferenceVerificationToken';
import ReferenceVerificationToken from '@/models/ReferenceVerificationToken';
import { sendReferenceVerificationReminder } from '@/lib/email/sendReferenceVerificationReminder';
import { sendReferenceReminderSent } from '@/lib/email/sendReferenceReminderSent';
import { findSeasonalExperienceForToken } from '@/lib/talentNetwork/mergeSeasonalExperience';
import type { SeasonalExperience } from '@/lib/talentNetwork/types';
import { processReferenceVerificationRequests } from '@/lib/talentNetwork/processReferenceRequests';
import {
  REFERENCE_AUTO_REMIND_AFTER_MS,
  REFERENCE_MAX_REMINDERS,
} from '@/lib/talentNetwork/referenceFollowupConstants';
import { canSendManagerReminder } from '@/lib/talentNetwork/referenceReminderEligibility';

export {
  REFERENCE_AUTO_REMIND_AFTER_MS,
  REFERENCE_MANUAL_REMIND_AFTER_MS,
  REFERENCE_MAX_REMINDERS,
} from '@/lib/talentNetwork/referenceFollowupConstants';
export { canSendManagerReminder } from '@/lib/talentNetwork/referenceReminderEligibility';
export type { ReminderEligibility } from '@/lib/talentNetwork/referenceReminderEligibility';

function seasonLabel(entry: SeasonalExperience): string | undefined {
  if (entry.seasonTag) return entry.seasonTag;
  if (entry.startMonth && entry.startYear) {
    const end =
      entry.endMonth && entry.endYear
        ? ` – ${entry.endMonth}/${entry.endYear}`
        : '';
    return `${entry.startMonth}/${entry.startYear}${end}`;
  }
  return undefined;
}

async function notifySeekerReminderSent(
  cv: Document & ICV,
  entry: SeasonalExperience,
  managerEmail: string
): Promise<void> {
  const jobSeeker = await User.findById(cv.jobSeeker).select('name email').lean();
  const notifyEmail =
    (typeof jobSeeker?.email === 'string' && jobSeeker.email.trim()) ||
    (typeof cv.email === 'string' && cv.email.trim()) ||
    '';
  if (!notifyEmail) return;

  await sendReferenceReminderSent({
    jobSeekerEmail: notifyEmail,
    jobSeekerName: jobSeeker?.name || cv.fullName,
    jobSeekerUserId: cv.jobSeeker ? String(cv.jobSeeker) : undefined,
    schoolName: entry.schoolName,
    seasonLabel: seasonLabel(entry),
    managerEmail,
  });
}

/**
 * Send one manager reminder + seeker notice. Does not extend token expiry.
 */
export async function sendReferenceReminderForEntry(input: {
  cv: Document & ICV;
  entry: SeasonalExperience;
  tokenDoc: Document & IReferenceVerificationToken;
  mode: 'auto' | 'manual';
  now?: Date;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const eligibility = canSendManagerReminder(
    input.tokenDoc,
    input.entry.lastReferenceEmailSentAt,
    { mode: input.mode, now: input.now }
  );
  if (!eligibility.ok) return eligibility;

  const result = await sendReferenceVerificationReminder({
    managerEmail: input.tokenDoc.managerEmail,
    candidateName: input.cv.fullName,
    schoolName: input.entry.schoolName,
    seasonLabel: seasonLabel(input.entry) || input.tokenDoc.seasonLabel,
    managerName: input.entry.referenceName,
    token: input.tokenDoc.token,
  });

  if (!result.success) {
    return { ok: false, reason: result.error || 'send_failed' };
  }

  const now = input.now ?? new Date();
  input.tokenDoc.reminderSentAt = now;
  input.tokenDoc.reminderCount = (input.tokenDoc.reminderCount ?? 0) + 1;
  if (result.messageId) {
    // Keep bounce correlation on the latest outbound message to this manager
    input.tokenDoc.resendMessageId = result.messageId;
  }
  await input.tokenDoc.save();

  input.entry.referenceReminderSentAt = now;
  input.cv.markModified('seasonalExperience');
  await input.cv.save();

  await notifySeekerReminderSent(
    input.cv,
    input.entry,
    input.tokenDoc.managerEmail
  );

  return { ok: true };
}

export async function expireStaleReferenceRequests(now = new Date()): Promise<{
  expired: number;
}> {
  await connectDB();

  const tokens = await ReferenceVerificationToken.find({
    expiresAt: { $lte: now },
    respondedAt: { $exists: false },
    bouncedAt: { $exists: false },
  });

  let expired = 0;
  for (const tokenDoc of tokens) {
    const cv = await CV.findById(tokenDoc.cvId);
    if (!cv?.seasonalExperience?.length) continue;

    const entry = findSeasonalExperienceForToken(cv.seasonalExperience, {
      _id: tokenDoc._id as mongoose.Types.ObjectId,
      experienceEntryId: tokenDoc.experienceEntryId,
      schoolName: tokenDoc.schoolName,
      managerEmail: tokenDoc.managerEmail,
      seasonLabel: tokenDoc.seasonLabel,
    });

    if (!entry) continue;
    if (entry.verificationStatus !== 'reference_requested') continue;

    entry.verificationStatus = 'reference_expired';
    cv.markModified('seasonalExperience');
    await cv.save();
    expired += 1;
  }

  return { expired };
}

export async function autoRemindOutstandingReferences(now = new Date()): Promise<{
  reminded: number;
  skipped: number;
}> {
  await connectDB();

  const cutoff = new Date(now.getTime() - REFERENCE_AUTO_REMIND_AFTER_MS);
  const tokens = await ReferenceVerificationToken.find({
    expiresAt: { $gt: now },
    respondedAt: { $exists: false },
    bouncedAt: { $exists: false },
    reminderSentAt: { $exists: false },
  }).limit(200);

  let reminded = 0;
  let skipped = 0;

  for (const tokenDoc of tokens) {
    if ((tokenDoc.reminderCount ?? 0) >= REFERENCE_MAX_REMINDERS) {
      skipped += 1;
      continue;
    }

    const cv = await CV.findById(tokenDoc.cvId);
    if (!cv?.seasonalExperience?.length) {
      skipped += 1;
      continue;
    }

    const entry = findSeasonalExperienceForToken(cv.seasonalExperience, {
      _id: tokenDoc._id as mongoose.Types.ObjectId,
      experienceEntryId: tokenDoc.experienceEntryId,
      schoolName: tokenDoc.schoolName,
      managerEmail: tokenDoc.managerEmail,
      seasonLabel: tokenDoc.seasonLabel,
    });

    if (!entry || entry.verificationStatus !== 'reference_requested') {
      skipped += 1;
      continue;
    }

    const lastSent = entry.lastReferenceEmailSentAt
      ? new Date(entry.lastReferenceEmailSentAt)
      : null;
    if (!lastSent || lastSent > cutoff) {
      skipped += 1;
      continue;
    }

    const result = await sendReferenceReminderForEntry({
      cv,
      entry,
      tokenDoc,
      mode: 'auto',
      now,
    });
    if (result.ok) {
      reminded += 1;
    } else {
      skipped += 1;
    }
  }

  return { reminded, skipped };
}

export async function processReferenceFollowups(now = new Date()): Promise<{
  reminded: number;
  skippedReminders: number;
  expired: number;
}> {
  const remindResult = await autoRemindOutstandingReferences(now);
  const expireResult = await expireStaleReferenceRequests(now);
  return {
    reminded: remindResult.reminded,
    skippedReminders: remindResult.skipped,
    expired: expireResult.expired,
  };
}

export type ReferenceAction = 'remind' | 'cancel' | 'resend';

export type ReferenceActionResult =
  | { ok: true; action: ReferenceAction; verificationStatus: string }
  | { ok: false; error: string; code?: string };

async function findOwnedCvEntry(
  userId: string,
  experienceEntryId: string
): Promise<
  | {
      ok: true;
      cv: Document & ICV;
      entry: SeasonalExperience;
    }
  | { ok: false; error: string; code?: string }
> {
  await connectDB();
  const cv = await CV.findOne({ jobSeeker: userId });
  if (!cv) {
    return { ok: false, error: 'Profile not found', code: 'not_found' };
  }
  const entry = (cv.seasonalExperience ?? []).find(
    (e) => e._id && String(e._id) === experienceEntryId
  );
  if (!entry) {
    return { ok: false, error: 'Experience entry not found', code: 'not_found' };
  }
  return { ok: true, cv, entry };
}

export async function runReferenceAction(input: {
  userId: string;
  experienceEntryId: string;
  action: ReferenceAction;
}): Promise<ReferenceActionResult> {
  const found = await findOwnedCvEntry(input.userId, input.experienceEntryId);
  if (!found.ok) return found;

  const { cv, entry } = found;

  if (input.action === 'cancel') {
    if (
      entry.verificationStatus !== 'reference_requested' &&
      entry.verificationStatus !== 'reference_expired' &&
      entry.verificationStatus !== 'reference_email_bounced'
    ) {
      return {
        ok: false,
        error: 'Nothing to cancel for this experience',
        code: 'invalid_state',
      };
    }

    if (entry.referenceTokenId) {
      await ReferenceVerificationToken.findByIdAndUpdate(entry.referenceTokenId, {
        $set: { expiresAt: new Date() },
      });
    }

    entry.verificationStatus = 'self_reported';
    entry.referenceTokenId = undefined;
    entry.lastReferenceEmailSentAt = undefined;
    entry.referenceReminderSentAt = undefined;
    entry.workConfirmed = undefined;
    entry.rehireAnswer = undefined;
    cv.markModified('seasonalExperience');
    await cv.save();
    return { ok: true, action: 'cancel', verificationStatus: 'self_reported' };
  }

  if (input.action === 'remind') {
    if (entry.verificationStatus !== 'reference_requested') {
      return {
        ok: false,
        error: 'Reminders are only available while awaiting a manager response',
        code: 'invalid_state',
      };
    }
    if (!entry.referenceTokenId) {
      return { ok: false, error: 'No active reference request', code: 'not_found' };
    }
    const tokenDoc = await ReferenceVerificationToken.findById(entry.referenceTokenId);
    if (!tokenDoc) {
      return { ok: false, error: 'No active reference request', code: 'not_found' };
    }

    const result = await sendReferenceReminderForEntry({
      cv,
      entry,
      tokenDoc,
      mode: 'manual',
    });
    if (!result.ok) {
      const messages: Record<string, string> = {
        too_soon: 'You can send a reminder after 3 days',
        already_reminded: 'A reminder was already sent',
        expired: 'This reference link has expired — request again',
        bounced: 'The previous email bounced — enter a different manager email',
      };
      return {
        ok: false,
        error: messages[result.reason] || 'Could not send reminder',
        code: result.reason,
      };
    }
    return { ok: true, action: 'remind', verificationStatus: 'reference_requested' };
  }

  // resend — for expired (or seeker wants a fresh send after expiry)
  if (entry.verificationStatus !== 'reference_expired' && entry.verificationStatus !== 'self_reported') {
    if (entry.verificationStatus === 'reference_requested') {
      return {
        ok: false,
        error: 'A request is already awaiting a response. Cancel it first or change the email.',
        code: 'invalid_state',
      };
    }
    if (entry.verificationStatus === 'reference_email_bounced') {
      return {
        ok: false,
        error: 'Enter a different manager email and save your profile',
        code: 'invalid_state',
      };
    }
    return {
      ok: false,
      error: 'Cannot re-send for this experience',
      code: 'invalid_state',
    };
  }

  if (!entry.referenceEmail?.trim()) {
    return {
      ok: false,
      error: 'Add a manager email before requesting again',
      code: 'missing_email',
    };
  }

  if (entry.referenceTokenId) {
    await ReferenceVerificationToken.findByIdAndUpdate(entry.referenceTokenId, {
      $set: { expiresAt: new Date() },
    });
  }
  entry.referenceTokenId = undefined;
  entry.lastReferenceEmailSentAt = undefined;
  entry.referenceReminderSentAt = undefined;
  entry.verificationStatus = 'self_reported';
  cv.markModified('seasonalExperience');
  await cv.save();

  await processReferenceVerificationRequests(cv);

  const refreshed = (cv.seasonalExperience ?? []).find(
    (e) => e._id && String(e._id) === input.experienceEntryId
  );
  return {
    ok: true,
    action: 'resend',
    verificationStatus: refreshed?.verificationStatus ?? 'self_reported',
  };
}
