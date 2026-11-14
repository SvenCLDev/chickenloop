import type { Document } from 'mongoose';
import type { ICV } from '@/models/CV';
import { generateProfileHeadline } from '@/lib/ai/generateProfileHeadline';
import {
  PROFILE_HEADLINE_MAX_LENGTH,
  headlineInputsChanged,
  sanitizeProfileHeadline,
  type ProfileHeadlineInput,
} from '@/lib/talentNetwork/profileHeadline';

type CvWithHeadline = Document &
  ICV & {
    profileHeadline?: string;
    profileHeadlineSource?: 'ai' | 'manual';
    profileHeadlineUpdatedAt?: Date;
  };

function snapshotInputs(cv: CvWithHeadline): ProfileHeadlineInput {
  return {
    lookingForWorkInAreas: (cv.lookingForWorkInAreas ?? []).map(String),
    experienceAndSkill: (cv.experienceAndSkill ?? []).map(String),
    verifiedCertificates: (cv.verifiedCertificates ?? []).map((c) => ({
      issuingBody: c.issuingBody,
      certificateLevel: c.certificateLevel,
      disciplines: c.disciplines,
      verificationStatus: c.verificationStatus,
    })),
    seasonalExperience: (cv.seasonalExperience ?? []).map((e) => ({
      role: e.role,
    })),
  };
}

/**
 * Apply client-provided headline and/or auto-generate when appropriate.
 * - Never overwrite manual headlines with auto generation.
 * - Re-saving the exact same AI headline keeps source `ai`.
 * - Changing the text (or admin force) marks source `manual`.
 */
export async function applyProfileHeadlineRules(
  cv: CvWithHeadline,
  body: Record<string, unknown>,
  options: {
    mode: 'create' | 'update';
    previousInputs?: ProfileHeadlineInput;
    forceManual?: boolean;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const previousSource = cv.profileHeadlineSource;
  const previousHeadline = sanitizeProfileHeadline(cv.profileHeadline);

  if (body.profileHeadline !== undefined) {
    if (body.profileHeadline === null || body.profileHeadline === '') {
      cv.profileHeadline = undefined;
      cv.profileHeadlineSource = undefined;
      cv.profileHeadlineUpdatedAt = undefined;
    } else {
      if (
        typeof body.profileHeadline === 'string' &&
        body.profileHeadline.trim().length > PROFILE_HEADLINE_MAX_LENGTH
      ) {
        return {
          ok: false,
          error: `profileHeadline must be at most ${PROFILE_HEADLINE_MAX_LENGTH} characters`,
        };
      }
      const sanitized = sanitizeProfileHeadline(body.profileHeadline);
      if (!sanitized) {
        return {
          ok: false,
          error: `profileHeadline must be a non-empty string up to ${PROFILE_HEADLINE_MAX_LENGTH} characters`,
        };
      }
      const changed = sanitized !== previousHeadline;
      cv.profileHeadline = sanitized;
      if (options.forceManual) {
        cv.profileHeadlineSource = 'manual';
      } else if (!changed && previousSource === 'ai') {
        cv.profileHeadlineSource = 'ai';
      } else {
        cv.profileHeadlineSource = 'manual';
      }
      if (changed || !cv.profileHeadlineUpdatedAt) {
        cv.profileHeadlineUpdatedAt = new Date();
      }
    }
  }

  if (cv.profileHeadlineSource === 'manual') {
    return { ok: true };
  }

  const currentInputs = snapshotInputs(cv);
  const needsInitial = !sanitizeProfileHeadline(cv.profileHeadline);
  const needsRefresh =
    cv.profileHeadlineSource === 'ai' &&
    options.previousInputs != null &&
    headlineInputsChanged(options.previousInputs, currentInputs);

  if (!needsInitial && !needsRefresh) {
    return { ok: true };
  }

  const generated = await generateProfileHeadline(currentInputs);
  if (generated.source === 'ai') {
    cv.profileHeadline = generated.headline;
    cv.profileHeadlineSource = 'ai';
    cv.profileHeadlineUpdatedAt = new Date();
  }

  return { ok: true };
}

export function captureHeadlineInputSnapshot(cv: CvWithHeadline): ProfileHeadlineInput {
  return snapshotInputs(cv);
}
