import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import CV from '@/models/CV';
import User from '@/models/User';
import ReferenceVerificationToken from '@/models/ReferenceVerificationToken';
import { applyReferenceEmailBounceToCv } from '@/lib/talentNetwork/applyReferenceEmailBounce';
import { sendReferenceEmailBounced } from '@/lib/email/sendReferenceEmailBounced';
import { findSeasonalExperienceForToken } from '@/lib/talentNetwork/mergeSeasonalExperience';

export type HandleReferenceEmailBounceInput = {
  resendMessageId: string;
  bounceType?: string;
};

export type HandleReferenceEmailBounceResult =
  | { ok: true; outcome: 'updated' | 'noop' | 'unknown_message' }
  | { ok: false; error: string };

/**
 * Correlate a Resend bounce/fail event to a reference token and notify the job seeker.
 */
export async function handleReferenceEmailBounce(
  input: HandleReferenceEmailBounceInput
): Promise<HandleReferenceEmailBounceResult> {
  const messageId = input.resendMessageId?.trim();
  if (!messageId) {
    return { ok: false, error: 'Missing Resend message id' };
  }

  await connectDB();

  const tokenDoc = await ReferenceVerificationToken.findOne({
    resendMessageId: messageId,
  });

  if (!tokenDoc) {
    return { ok: true, outcome: 'unknown_message' };
  }

  const cv = await CV.findById(tokenDoc.cvId);
  if (!cv) {
    tokenDoc.bouncedAt = tokenDoc.bouncedAt ?? new Date();
    tokenDoc.bounceType = input.bounceType ?? tokenDoc.bounceType ?? 'bounced';
    tokenDoc.expiresAt = new Date();
    await tokenDoc.save();
    return { ok: true, outcome: 'noop' };
  }

  const applyResult = applyReferenceEmailBounceToCv(cv, tokenDoc, {
    bounceType: input.bounceType,
  });

  if (applyResult.status === 'noop') {
    return { ok: true, outcome: 'noop' };
  }

  await Promise.all([cv.save(), tokenDoc.save()]);

  if (applyResult.status === 'missing_entry') {
    return { ok: true, outcome: 'noop' };
  }

  const jobSeeker = await User.findById(cv.jobSeeker).select('name email').lean();
  const notifyEmail =
    (typeof jobSeeker?.email === 'string' && jobSeeker.email.trim()) ||
    (typeof cv.email === 'string' && cv.email.trim()) ||
    '';

  if (notifyEmail) {
    const entry = findSeasonalExperienceForToken(cv.seasonalExperience, {
      _id: tokenDoc._id as mongoose.Types.ObjectId,
      experienceEntryId: tokenDoc.experienceEntryId,
      schoolName: tokenDoc.schoolName,
      managerEmail: tokenDoc.managerEmail,
      seasonLabel: tokenDoc.seasonLabel,
    });

    await sendReferenceEmailBounced({
      jobSeekerEmail: notifyEmail,
      jobSeekerName: jobSeeker?.name || cv.fullName,
      jobSeekerUserId: cv.jobSeeker ? String(cv.jobSeeker) : undefined,
      schoolName: applyResult.schoolName,
      seasonLabel: applyResult.seasonLabel || entry?.seasonTag,
      managerEmail: applyResult.managerEmail,
    });
  }

  return { ok: true, outcome: 'updated' };
}
