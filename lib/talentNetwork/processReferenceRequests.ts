import type { Document } from 'mongoose';
import mongoose from 'mongoose';
import type { ICV } from '@/models/CV';
import type { IReferenceVerificationToken } from '@/models/ReferenceVerificationToken';
import ReferenceVerificationToken from '@/models/ReferenceVerificationToken';
import User from '@/models/User';
import { sendReferenceVerificationEmail } from '@/lib/email/sendReferenceVerificationEmail';
import { sendReferenceRequestFyi } from '@/lib/email/sendReferenceRequestFyi';
import { findSeasonalExperienceForToken } from '@/lib/talentNetwork/mergeSeasonalExperience';
import {
  isSelfAsReferenceEmail,
} from '@/lib/talentNetwork/referenceChase';
import { logReferenceMetric } from '@/lib/talentNetwork/referenceMetrics';
import { REFERENCE_EXPIRY_DAYS } from '@/lib/talentNetwork/referenceFollowupConstants';
import type { SeasonalExperience } from '@/lib/talentNetwork/types';
import type { ReferenceConfirmInput } from '@/lib/referenceVerificationToken';
import { generateReferenceToken } from '@/lib/referenceVerificationToken';

export const COOLDOWN_MS = 24 * 60 * 60 * 1000;
/** @deprecated Prefer REFERENCE_EXPIRY_DAYS — kept for existing imports. */
export const EXPIRY_DAYS = REFERENCE_EXPIRY_DAYS;

export const EXPERIENCE_REMOVED_ERROR =
  "This reference request is no longer active because the work experience was removed from the candidate's profile.";

export type ReferenceConfirmContext =
  | { status: 'error'; error: string; httpStatus?: 404 | 410 }
  | {
      status: 'entry_removed';
      candidateName: string;
      schoolName: string;
      seasonLabel?: string;
    }
  | {
      status: 'responded';
      candidateName: string;
      schoolName: string;
      seasonLabel?: string;
      worked: boolean;
      rehire?: boolean;
    }
  | {
      status: 'pending';
      candidateName: string;
      schoolName: string;
      seasonLabel?: string;
      tokenDoc: Document & IReferenceVerificationToken;
      cv: Document & ICV;
      entry: SeasonalExperience;
    };

function tokenResponseState(tokenDoc: {
  workConfirmed?: boolean;
  confirmed?: boolean;
  rehire?: boolean;
}): { worked: boolean; rehire?: boolean } {
  const worked =
    tokenDoc.workConfirmed === false
      ? false
      : tokenDoc.workConfirmed === true ||
          tokenDoc.confirmed === true ||
          tokenDoc.rehire !== undefined;
  return { worked, rehire: tokenDoc.rehire };
}

export async function getReferenceConfirmContext(
  token: string
): Promise<ReferenceConfirmContext> {
  const tokenDoc = await ReferenceVerificationToken.findOne({ token });
  if (!tokenDoc) {
    return { status: 'error', error: 'Invalid reference link', httpStatus: 404 };
  }
  if (tokenDoc.expiresAt < new Date()) {
    return { status: 'error', error: 'Reference link expired', httpStatus: 410 };
  }

  if (tokenDoc.respondedAt) {
    const { worked, rehire } = tokenResponseState(tokenDoc);
    return {
      status: 'responded',
      candidateName: tokenDoc.candidateName,
      schoolName: tokenDoc.schoolName,
      seasonLabel: tokenDoc.seasonLabel,
      worked,
      rehire,
    };
  }

  const CV = (await import('@/models/CV')).default;
  const cv = await CV.findById(tokenDoc.cvId);
  if (!cv) {
    return { status: 'error', error: 'Profile not found' };
  }

  const entry = findSeasonalExperienceForToken(cv.seasonalExperience, {
    _id: tokenDoc._id as mongoose.Types.ObjectId,
    experienceEntryId: tokenDoc.experienceEntryId,
    schoolName: tokenDoc.schoolName,
    managerEmail: tokenDoc.managerEmail,
    seasonLabel: tokenDoc.seasonLabel,
  });

  if (!entry) {
    return {
      status: 'entry_removed',
      candidateName: tokenDoc.candidateName,
      schoolName: tokenDoc.schoolName,
      seasonLabel: tokenDoc.seasonLabel,
    };
  }

  return {
    status: 'pending',
    candidateName: tokenDoc.candidateName,
    schoolName: tokenDoc.schoolName,
    seasonLabel: tokenDoc.seasonLabel,
    tokenDoc,
    cv,
    entry,
  };
}

function seasonLabel(entry: {
  seasonTag?: string;
  startMonth?: number;
  startYear?: number;
  endMonth?: number | null;
  endYear?: number | null;
}): string | undefined {
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

async function invalidatePreviousToken(
  tokenId: mongoose.Types.ObjectId | string | undefined
): Promise<void> {
  if (!tokenId) return;
  await ReferenceVerificationToken.findByIdAndUpdate(tokenId, {
    $set: { expiresAt: new Date() },
  });
}

async function notifySeekerReferenceFyi(
  cv: Document & ICV,
  entry: SeasonalExperience,
  managerEmail: string,
  reason: 'initial' | 'reminder' | 'resend_fyi'
): Promise<void> {
  const jobSeeker = await User.findById(cv.jobSeeker).select('name email').lean();
  const notifyEmail =
    (typeof jobSeeker?.email === 'string' && jobSeeker.email.trim()) ||
    (typeof cv.email === 'string' && cv.email.trim()) ||
    '';
  if (!notifyEmail) return;

  await sendReferenceRequestFyi({
    jobSeekerEmail: notifyEmail,
    jobSeekerName: jobSeeker?.name || cv.fullName,
    jobSeekerUserId: cv.jobSeeker ? String(cv.jobSeeker) : undefined,
    schoolName: entry.schoolName,
    seasonLabel: seasonLabel(entry),
    managerEmail,
    managerName: entry.referenceName,
    reason,
    experienceEntryId: entry._id ? String(entry._id) : undefined,
  });
}

export async function processReferenceVerificationRequests(
  cv: Document & ICV
): Promise<void> {
  if (!cv.seasonalExperience?.length) return;

  const jobSeeker = await User.findById(cv.jobSeeker).select('email').lean();
  const seekerEmails = [jobSeeker?.email, cv.email];

  let modified = false;

  for (const entry of cv.seasonalExperience) {
    const email = entry.referenceEmail?.trim();
    if (!email) continue;
    if (
      entry.verificationStatus === 'reference_confirmed' ||
      entry.verificationStatus === 'reference_disputed'
    ) {
      continue;
    }

    // Never send a confirm token to the seeker's own inbox
    if (isSelfAsReferenceEmail(email, seekerEmails)) {
      continue;
    }

    if (!entry._id) continue;
    const entryId = String(entry._id);

    // Do not re-send to the same address that already bounced until the seeker changes it
    if (entry.verificationStatus === 'reference_email_bounced') {
      const bouncedToken = entry.referenceTokenId
        ? await ReferenceVerificationToken.findById(entry.referenceTokenId).lean()
        : null;
      if (
        bouncedToken?.bouncedAt &&
        bouncedToken.managerEmail?.toLowerCase() === email.toLowerCase()
      ) {
        continue;
      }
    }

    let emailChanged = false;
    if (entry.referenceTokenId) {
      const linkedToken = await ReferenceVerificationToken.findById(
        entry.referenceTokenId
      ).lean();
      if (
        linkedToken?.managerEmail &&
        linkedToken.managerEmail.toLowerCase() !== email.toLowerCase()
      ) {
        emailChanged = true;
        await invalidatePreviousToken(entry.referenceTokenId);
        entry.referenceTokenId = undefined;
        entry.lastReferenceEmailSentAt = undefined;
        entry.referenceReminderSentAt = undefined;
      }
    }

    const lastSent = entry.lastReferenceEmailSentAt
      ? new Date(entry.lastReferenceEmailSentAt).getTime()
      : 0;
    // Bypass cooldown when the manager email changed so seekers can switch contacts immediately
    if (!emailChanged && lastSent && Date.now() - lastSent < COOLDOWN_MS) {
      continue;
    }

    let tokenDoc = await ReferenceVerificationToken.findOne({
      cvId: cv._id,
      experienceEntryId: entryId,
      managerEmail: email.toLowerCase(),
      respondedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });

    if (!tokenDoc) {
      tokenDoc = await ReferenceVerificationToken.create({
        cvId: cv._id,
        experienceEntryId: entryId,
        managerEmail: email.toLowerCase(),
        token: generateReferenceToken(),
        candidateName: cv.fullName,
        schoolName: entry.schoolName,
        seasonLabel: seasonLabel(entry),
        expiresAt: new Date(
          Date.now() + REFERENCE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
        ),
      });
    }

    // Never Cc the seeker on this message — confirm links are bearer tokens.
    const result = await sendReferenceVerificationEmail({
      managerEmail: email,
      candidateName: cv.fullName,
      schoolName: entry.schoolName,
      seasonLabel: seasonLabel(entry),
      managerName: entry.referenceName,
      seekerNote: entry.referenceNoteFromSeeker,
      token: tokenDoc.token,
    });

    if (result.success) {
      entry.verificationStatus = 'reference_requested';
      entry.referenceTokenId = tokenDoc._id as mongoose.Types.ObjectId;
      entry.lastReferenceEmailSentAt = new Date();
      entry.referenceReminderSentAt = undefined;
      if (result.messageId) {
        tokenDoc.resendMessageId = result.messageId;
        tokenDoc.bouncedAt = undefined;
        tokenDoc.bounceType = undefined;
        tokenDoc.reminderSentAt = undefined;
        tokenDoc.reminderCount = 0;
        await tokenDoc.save();
      } else {
        tokenDoc.reminderSentAt = undefined;
        tokenDoc.reminderCount = 0;
        await tokenDoc.save();
      }
      logReferenceMetric('reference_request_sent', {
        cvId: String(cv._id),
        experienceEntryId: entryId,
      });
      // Separate token-free FYI to the seeker (not a Cc of the manager mail)
      await notifySeekerReferenceFyi(cv, entry, email, 'initial');
      modified = true;
    }
  }

  if (modified) {
    cv.markModified('seasonalExperience');
    await cv.save();
  }
}

export async function confirmReferenceToken(
  token: string,
  response: ReferenceConfirmInput
): Promise<
  | {
      ok: true;
      candidateName: string;
      worked: boolean;
      rehire?: boolean;
    }
  | { ok: false; error: string; code?: 'experience_removed' }
> {
  const context = await getReferenceConfirmContext(token);
  if (context.status === 'error') {
    return { ok: false, error: context.error };
  }
  if (context.status === 'entry_removed') {
    return {
      ok: false,
      error: EXPERIENCE_REMOVED_ERROR,
      code: 'experience_removed',
    };
  }
  if (context.status === 'responded') {
    return {
      ok: true,
      candidateName: context.candidateName,
      worked: context.worked,
      rehire: context.rehire,
    };
  }

  const { tokenDoc, cv, entry } = context;

  if (response.worked === false) {
    entry.verificationStatus = 'reference_disputed';
    entry.workConfirmed = false;
    entry.rehireAnswer = undefined;
    tokenDoc.confirmed = false;
    tokenDoc.workConfirmed = false;
    tokenDoc.rehire = undefined;
  } else {
    entry.verificationStatus = 'reference_confirmed';
    entry.workConfirmed = true;
    entry.rehireAnswer = response.rehire;
    tokenDoc.confirmed = true;
    tokenDoc.workConfirmed = true;
    tokenDoc.rehire = response.rehire;
  }

  cv.markModified('seasonalExperience');
  await cv.save();

  tokenDoc.respondedAt = new Date();
  await tokenDoc.save();

  logReferenceMetric(
    response.worked === false ? 'reference_disputed' : 'reference_confirmed',
    {
      cvId: String(cv._id),
      experienceEntryId: String(entry._id ?? ''),
    }
  );

  return {
    ok: true,
    candidateName: tokenDoc.candidateName,
    worked: response.worked,
    rehire: response.rehire,
  };
}
