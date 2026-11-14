/**
 * Bump CV.professionalProfileUpdatedAt only when meaningful professional
 * fields change — not on featured boost, publish-only toggles, etc.
 */

const PROFESSIONAL_BODY_KEYS = new Set([
  'lookingForWorkInAreas',
  'experienceAndSkill',
  'verifiedCertificates',
  'seasonalExperience',
  'languageSkills',
  'languages',
  'address',
  'nationalityCountry',
  'preferredWorkCountries',
  'workEligibleCountries',
  'euEeaWorkRights',
  'workAuthorizations',
  'availability',
  'experienceLevel',
  'profileHeadline',
  'summary',
  'experience',
  'professionalCertifications',
  'certifications',
  'pictures',
]);

export function bodyHasProfessionalProfileChanges(
  body: Record<string, unknown>
): boolean {
  return Object.keys(body).some((key) => PROFESSIONAL_BODY_KEYS.has(key));
}

export function touchProfessionalProfileUpdatedAt(
  cv: { professionalProfileUpdatedAt?: Date },
  body: Record<string, unknown>,
  options?: { force?: boolean }
): void {
  if (options?.force || bodyHasProfessionalProfileChanges(body)) {
    cv.professionalProfileUpdatedAt = new Date();
  }
}
