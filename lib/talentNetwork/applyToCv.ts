import type { Document } from 'mongoose';
import type { ICV } from '@/models/CV';
import { syncLegacyFieldsFromTalentNetwork } from './syncLegacyFields';
import {
  normalizeCertificatesForSave,
  validateTalentNetworkPayload,
} from './validators';
import { mergeSeasonalExperienceForSave } from './mergeSeasonalExperience';
import type { ProfileSchemaVersion } from './types';

export function applyTalentNetworkFieldsToCv(
  cv: Document & ICV,
  body: Record<string, unknown>,
  options?: { forceSchemaVersion?: ProfileSchemaVersion }
): { ok: true } | { ok: false; error: string } {
  const parsed = validateTalentNetworkPayload(body);
  if (!parsed.ok) {
    return parsed;
  }

  const { value } = parsed;

  if (value.profileSchemaVersion !== undefined) {
    cv.profileSchemaVersion = value.profileSchemaVersion;
  } else if (options?.forceSchemaVersion !== undefined) {
    cv.profileSchemaVersion = options.forceSchemaVersion;
  }

  if (value.verifiedCertificates !== undefined) {
    cv.verifiedCertificates = normalizeCertificatesForSave(value.verifiedCertificates);
    cv.markModified('verifiedCertificates');
  }

  if (value.seasonalExperience !== undefined) {
    cv.seasonalExperience = mergeSeasonalExperienceForSave(
      cv.seasonalExperience,
      value.seasonalExperience
    );
    cv.markModified('seasonalExperience');
  }

  if (value.languageSkills !== undefined) {
    cv.languageSkills = value.languageSkills;
    cv.markModified('languageSkills');
  }

  if (cv.profileSchemaVersion === 2) {
    const legacy = syncLegacyFieldsFromTalentNetwork({
      verifiedCertificates: cv.verifiedCertificates,
      seasonalExperience: cv.seasonalExperience,
      languageSkills: cv.languageSkills,
    });
    cv.professionalCertifications = legacy.professionalCertifications;
    cv.certifications = legacy.certifications;
    cv.experience = legacy.experience;
    cv.languages = legacy.languages;
    cv.markModified('professionalCertifications');
    cv.markModified('certifications');
    cv.markModified('experience');
    cv.markModified('languages');
  }

  return { ok: true };
}
