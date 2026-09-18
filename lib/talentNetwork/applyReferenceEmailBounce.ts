import type { Document } from 'mongoose';
import mongoose from 'mongoose';
import type { ICV } from '@/models/CV';
import type { IReferenceVerificationToken } from '@/models/ReferenceVerificationToken';
import { findSeasonalExperienceForToken } from '@/lib/talentNetwork/mergeSeasonalExperience';

export type ApplyReferenceEmailBounceResult =
  | { status: 'updated'; schoolName: string; seasonLabel?: string; managerEmail: string }
  | { status: 'noop'; reason: string }
  | { status: 'missing_entry' };

/**
 * Apply bounce state to CV experience + token. Pure of email sending / DB connect.
 * Idempotent for already-bounced; does not overwrite confirmed/disputed.
 */
export function applyReferenceEmailBounceToCv(
  cv: Document & ICV,
  tokenDoc: Document & IReferenceVerificationToken,
  bounceMeta?: { bounceType?: string }
): ApplyReferenceEmailBounceResult {
  if (tokenDoc.bouncedAt && tokenDoc.respondedAt) {
    return { status: 'noop', reason: 'already_bounced' };
  }

  const entry = findSeasonalExperienceForToken(cv.seasonalExperience, {
    _id: tokenDoc._id as mongoose.Types.ObjectId,
    experienceEntryId: tokenDoc.experienceEntryId,
    schoolName: tokenDoc.schoolName,
    managerEmail: tokenDoc.managerEmail,
    seasonLabel: tokenDoc.seasonLabel,
  });

  if (!entry) {
    tokenDoc.bouncedAt = tokenDoc.bouncedAt ?? new Date();
    tokenDoc.bounceType = bounceMeta?.bounceType ?? tokenDoc.bounceType;
    tokenDoc.expiresAt = new Date();
    if (!tokenDoc.respondedAt) {
      tokenDoc.respondedAt = new Date();
      tokenDoc.confirmed = false;
    }
    return { status: 'missing_entry' };
  }

  if (
    entry.verificationStatus === 'reference_confirmed' ||
    entry.verificationStatus === 'reference_disputed'
  ) {
    return { status: 'noop', reason: 'already_resolved' };
  }

  if (entry.verificationStatus === 'reference_email_bounced' && tokenDoc.bouncedAt) {
    return { status: 'noop', reason: 'already_bounced' };
  }

  entry.verificationStatus = 'reference_email_bounced';
  entry.lastReferenceEmailSentAt = undefined;
  entry.referenceReminderSentAt = undefined;
  cv.markModified('seasonalExperience');

  const now = new Date();
  tokenDoc.bouncedAt = now;
  tokenDoc.bounceType = bounceMeta?.bounceType ?? 'bounced';
  tokenDoc.expiresAt = now;
  if (!tokenDoc.respondedAt) {
    tokenDoc.respondedAt = now;
    tokenDoc.confirmed = false;
  }

  return {
    status: 'updated',
    schoolName: entry.schoolName || tokenDoc.schoolName,
    seasonLabel: tokenDoc.seasonLabel,
    managerEmail: tokenDoc.managerEmail,
  };
}
