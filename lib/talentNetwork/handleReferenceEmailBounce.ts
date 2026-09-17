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
// #region agent log
function debugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>
) {
  const payload = {
    sessionId: '85d025',
    runId: 'pre-fix',
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  console.log('[handleReferenceEmailBounce][debug]', JSON.stringify(payload));
  fetch('http://127.0.0.1:7714/ingest/809469dc-4731-4443-a5ec-6d4761840282', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '85d025',
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
// #endregion

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

  // #region agent log
  debugLog('D', 'handleReferenceEmailBounce.ts:lookup', 'Token lookup by resendMessageId', {
    emailIdSuffix: messageId.slice(-8),
    found: Boolean(tokenDoc),
    hasBouncedAt: Boolean(tokenDoc?.bouncedAt),
    hasRespondedAt: Boolean(tokenDoc?.respondedAt),
    tokenHasMessageId: Boolean(tokenDoc?.resendMessageId),
  });
  // #endregion

  if (!tokenDoc) {
    return { ok: true, outcome: 'unknown_message' };
  }

  const cv = await CV.findById(tokenDoc.cvId);
  if (!cv) {
    tokenDoc.bouncedAt = tokenDoc.bouncedAt ?? new Date();
    tokenDoc.bounceType = input.bounceType ?? tokenDoc.bounceType ?? 'bounced';
    tokenDoc.expiresAt = new Date();
    await tokenDoc.save();
    // #region agent log
    debugLog('E', 'handleReferenceEmailBounce.ts:no_cv', 'Token found but CV missing', {
      emailIdSuffix: messageId.slice(-8),
    });
    // #endregion
    return { ok: true, outcome: 'noop' };
  }

  const applyResult = applyReferenceEmailBounceToCv(cv, tokenDoc, {
    bounceType: input.bounceType,
  });

  // #region agent log
  debugLog('E', 'handleReferenceEmailBounce.ts:apply', 'Apply bounce to CV', {
    applyStatus: applyResult.status,
    reason: applyResult.status === 'noop' ? applyResult.reason : undefined,
    entryStatus:
      findSeasonalExperienceForToken(cv.seasonalExperience, {
        _id: tokenDoc._id as mongoose.Types.ObjectId,
        experienceEntryId: tokenDoc.experienceEntryId,
        schoolName: tokenDoc.schoolName,
        managerEmail: tokenDoc.managerEmail,
        seasonLabel: tokenDoc.seasonLabel,
      })?.verificationStatus ?? null,
  });
  // #endregion

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

  // #region agent log
  debugLog('E', 'handleReferenceEmailBounce.ts:notify', 'Seeker notify path', {
    hasNotifyEmail: Boolean(notifyEmail),
    notifySource: jobSeeker?.email
      ? 'user'
      : typeof cv.email === 'string' && cv.email.trim()
        ? 'cv'
        : 'none',
  });
  // #endregion

  if (notifyEmail) {
    const entry = findSeasonalExperienceForToken(cv.seasonalExperience, {
      _id: tokenDoc._id as mongoose.Types.ObjectId,
      experienceEntryId: tokenDoc.experienceEntryId,
      schoolName: tokenDoc.schoolName,
      managerEmail: tokenDoc.managerEmail,
      seasonLabel: tokenDoc.seasonLabel,
    });

    const sendResult = await sendReferenceEmailBounced({
      jobSeekerEmail: notifyEmail,
      jobSeekerName: jobSeeker?.name || cv.fullName,
      jobSeekerUserId: cv.jobSeeker ? String(cv.jobSeeker) : undefined,
      schoolName: applyResult.schoolName,
      seasonLabel: applyResult.seasonLabel || entry?.seasonTag,
      managerEmail: applyResult.managerEmail,
    });

    // #region agent log
    debugLog('E', 'handleReferenceEmailBounce.ts:notify_result', 'Seeker bounce email send result', {
      success: sendResult.success,
      hasMessageId: Boolean(sendResult.messageId),
      error: sendResult.error ?? null,
    });
    // #endregion
  }

  return { ok: true, outcome: 'updated' };
}
