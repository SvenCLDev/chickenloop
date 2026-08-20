import type { Document } from 'mongoose';
import mongoose from 'mongoose';
import type { ICV } from '@/models/CV';
import ReferenceVerificationToken from '@/models/ReferenceVerificationToken';
import { sendReferenceVerificationEmail } from '@/lib/email/sendReferenceVerificationEmail';
import { findSeasonalExperienceForToken } from '@/lib/talentNetwork/mergeSeasonalExperience';
import { generateReferenceToken } from '@/lib/referenceVerificationToken';

const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const EXPIRY_DAYS = 14;

function logReferenceDebug(
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string
): void {
  console.log('[ReferenceVerification]', message, data);
  // #region agent log
  fetch('http://127.0.0.1:7714/ingest/809469dc-4731-4443-a5ec-6d4761840282', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '85d025' },
    body: JSON.stringify({
      sessionId: '85d025',
      runId: 'reference-email',
      hypothesisId,
      location: 'processReferenceRequests.ts',
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
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

export async function processReferenceVerificationRequests(
  cv: Document & ICV
): Promise<void> {
  if (!cv.seasonalExperience?.length) {
    logReferenceDebug('no seasonal experience on cv', { cvId: String(cv._id) }, 'C');
    return;
  }

  let modified = false;
  const resendConfigured = Boolean(process.env.RESEND_API_KEY?.trim());

  for (const entry of cv.seasonalExperience) {
    const email = entry.referenceEmail?.trim();
    if (!email) continue;
    if (entry.verificationStatus === 'reference_confirmed') continue;

    if (!entry._id) {
      logReferenceDebug(
        'skipped entry without _id',
        {
          cvId: String(cv._id),
          schoolName: entry.schoolName,
          resendConfigured,
        },
        'A'
      );
      continue;
    }
    const entryId = String(entry._id);
    const lastSent = entry.lastReferenceEmailSentAt
      ? new Date(entry.lastReferenceEmailSentAt).getTime()
      : 0;
    if (lastSent && Date.now() - lastSent < COOLDOWN_MS) {
      logReferenceDebug(
        'skipped cooldown',
        { cvId: String(cv._id), entryId, schoolName: entry.schoolName },
        'E'
      );
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
        expiresAt: new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      });
    }

    const result = await sendReferenceVerificationEmail({
      managerEmail: email,
      candidateName: cv.fullName,
      schoolName: entry.schoolName,
      seasonLabel: seasonLabel(entry),
      managerName: entry.referenceName,
      token: tokenDoc.token,
    });

    logReferenceDebug(
      result.success ? 'reference email sent' : 'reference email failed',
      {
        cvId: String(cv._id),
        entryId,
        schoolName: entry.schoolName,
        resendConfigured,
        success: result.success,
        error: result.error ?? null,
      },
      result.success ? 'OK' : 'B'
    );

    if (result.success) {
      entry.verificationStatus = 'reference_requested';
      entry.referenceTokenId = tokenDoc._id as mongoose.Types.ObjectId;
      entry.lastReferenceEmailSentAt = new Date();
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
  rehire: boolean
): Promise<{ ok: true; candidateName: string } | { ok: false; error: string }> {
  const tokenDoc = await ReferenceVerificationToken.findOne({ token });
  if (!tokenDoc) {
    return { ok: false, error: 'Invalid or expired reference link' };
  }
  if (tokenDoc.expiresAt < new Date()) {
    return { ok: false, error: 'This reference link has expired' };
  }
  if (tokenDoc.respondedAt) {
    return { ok: true, candidateName: tokenDoc.candidateName };
  }

  const CV = (await import('@/models/CV')).default;
  const cv = await CV.findById(tokenDoc.cvId);
  if (!cv) {
    return { ok: false, error: 'Profile not found' };
  }

  const entry = findSeasonalExperienceForToken(cv.seasonalExperience, {
    _id: tokenDoc._id as mongoose.Types.ObjectId,
    experienceEntryId: tokenDoc.experienceEntryId,
    schoolName: tokenDoc.schoolName,
    managerEmail: tokenDoc.managerEmail,
    seasonLabel: tokenDoc.seasonLabel,
  });
  if (!entry) {
    return { ok: false, error: 'Experience entry not found' };
  }

  entry.verificationStatus = 'reference_confirmed';
  entry.rehireAnswer = rehire;
  cv.markModified('seasonalExperience');
  await cv.save();

  tokenDoc.respondedAt = new Date();
  tokenDoc.confirmed = true;
  tokenDoc.rehire = rehire;
  await tokenDoc.save();

  return { ok: true, candidateName: tokenDoc.candidateName };
}
