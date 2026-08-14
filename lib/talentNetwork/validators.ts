import { OFFICIAL_LANGUAGES } from '@/lib/languages';
import {
  CERTIFICATE_VERIFICATION_STATUSES,
  EXPERIENCE_VERIFICATION_STATUSES,
  ISSUING_BODIES,
  LANGUAGE_PROFICIENCIES,
  LANGUAGE_VERIFICATION_STATUSES,
  type LanguageSkill,
  type ProfileSchemaVersion,
  type SeasonalExperience,
  type VerifiedCertificate,
  WATERSPORT_DISCIPLINES,
} from './types';

function isValidMonth(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 12;
}

function isValidYear(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1970 && value <= 2100;
}

export function isIssuingBody(value: unknown): value is (typeof ISSUING_BODIES)[number] {
  return typeof value === 'string' && (ISSUING_BODIES as readonly string[]).includes(value);
}

export function isCertificateVerificationStatus(
  value: unknown
): value is (typeof CERTIFICATE_VERIFICATION_STATUSES)[number] {
  return (
    typeof value === 'string' &&
    (CERTIFICATE_VERIFICATION_STATUSES as readonly string[]).includes(value)
  );
}

export function isExperienceVerificationStatus(
  value: unknown
): value is (typeof EXPERIENCE_VERIFICATION_STATUSES)[number] {
  return (
    typeof value === 'string' &&
    (EXPERIENCE_VERIFICATION_STATUSES as readonly string[]).includes(value)
  );
}

export function isLanguageProficiency(
  value: unknown
): value is (typeof LANGUAGE_PROFICIENCIES)[number] {
  return (
    typeof value === 'string' && (LANGUAGE_PROFICIENCIES as readonly string[]).includes(value)
  );
}

export function isLanguageVerificationStatus(
  value: unknown
): value is (typeof LANGUAGE_VERIFICATION_STATUSES)[number] {
  return (
    typeof value === 'string' &&
    (LANGUAGE_VERIFICATION_STATUSES as readonly string[]).includes(value)
  );
}

export function isProfileSchemaVersion(value: unknown): value is ProfileSchemaVersion {
  return value === 1 || value === 2;
}

function parseOptionalDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function validateVerifiedCertificate(
  input: unknown
): { ok: true; value: VerifiedCertificate } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Certificate must be an object' };
  }
  const raw = input as Record<string, unknown>;
  if (!isIssuingBody(raw.issuingBody)) {
    return { ok: false, error: 'Invalid issuing body' };
  }
  if (typeof raw.certificateLevel !== 'string' || !raw.certificateLevel.trim()) {
    return { ok: false, error: 'Certificate level is required' };
  }
  const disciplines = Array.isArray(raw.disciplines)
    ? raw.disciplines.filter(
        (d): d is string =>
          typeof d === 'string' &&
          (WATERSPORT_DISCIPLINES as readonly string[]).includes(d)
      )
    : [];
  const status = raw.verificationStatus ?? 'unverified';
  if (!isCertificateVerificationStatus(status)) {
    return { ok: false, error: 'Invalid certificate verification status' };
  }
  return {
    ok: true,
    value: {
      issuingBody: raw.issuingBody,
      certificateLevel: raw.certificateLevel.trim(),
      disciplines,
      licenseMemberId:
        typeof raw.licenseMemberId === 'string' ? raw.licenseMemberId.trim() : undefined,
      issueDate: parseOptionalDate(raw.issueDate),
      expiryDate: parseOptionalDate(raw.expiryDate),
      documentUrl: typeof raw.documentUrl === 'string' ? raw.documentUrl : undefined,
      verificationStatus: status,
      legacySource: typeof raw.legacySource === 'string' ? raw.legacySource : undefined,
      adminNote: typeof raw.adminNote === 'string' ? raw.adminNote : undefined,
    },
  };
}

export function validateSeasonalExperience(
  input: unknown
): { ok: true; value: SeasonalExperience } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Experience entry must be an object' };
  }
  const raw = input as Record<string, unknown>;
  if (typeof raw.schoolName !== 'string' || !raw.schoolName.trim()) {
    return { ok: false, error: 'School / center name is required' };
  }
  if (typeof raw.role !== 'string' || !raw.role.trim()) {
    return { ok: false, error: 'Role is required' };
  }
  if (!isValidMonth(raw.startMonth) || !isValidYear(raw.startYear)) {
    return { ok: false, error: 'Valid start month and year are required' };
  }
  const endMonth =
    raw.endMonth === null || raw.endMonth === undefined
      ? undefined
      : isValidMonth(raw.endMonth)
        ? raw.endMonth
        : undefined;
  const endYear =
    raw.endYear === null || raw.endYear === undefined
      ? undefined
      : isValidYear(raw.endYear)
        ? raw.endYear
        : undefined;
  const status = raw.verificationStatus ?? 'self_reported';
  if (!isExperienceVerificationStatus(status)) {
    return { ok: false, error: 'Invalid experience verification status' };
  }
  return {
    ok: true,
    value: {
      schoolName: raw.schoolName.trim(),
      role: raw.role.trim(),
      startMonth: raw.startMonth,
      startYear: raw.startYear,
      endMonth: endMonth ?? null,
      endYear: endYear ?? null,
      seasonTag: typeof raw.seasonTag === 'string' ? raw.seasonTag.trim() : undefined,
      referenceName:
        typeof raw.referenceName === 'string' ? raw.referenceName.trim() : undefined,
      referenceEmail:
        typeof raw.referenceEmail === 'string' ? raw.referenceEmail.trim() : undefined,
      referencePhone:
        typeof raw.referencePhone === 'string' ? raw.referencePhone.trim() : undefined,
      verificationStatus: status,
      rehireAnswer: typeof raw.rehireAnswer === 'boolean' ? raw.rehireAnswer : undefined,
    },
  };
}

export function validateLanguageSkill(
  input: unknown
): { ok: true; value: LanguageSkill } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Language skill must be an object' };
  }
  const raw = input as Record<string, unknown>;
  if (typeof raw.language !== 'string' || !OFFICIAL_LANGUAGES.includes(raw.language)) {
    return { ok: false, error: 'Invalid language' };
  }
  if (!isLanguageProficiency(raw.proficiency)) {
    return { ok: false, error: 'Invalid proficiency level' };
  }
  const status = raw.verificationStatus ?? 'self_assessed';
  if (!isLanguageVerificationStatus(status)) {
    return { ok: false, error: 'Invalid language verification status' };
  }
  return {
    ok: true,
    value: {
      language: raw.language,
      proficiency: raw.proficiency,
      verificationStatus: status,
    },
  };
}

export function validateTalentNetworkPayload(body: Record<string, unknown>): {
  ok: true;
  value: {
    profileSchemaVersion?: ProfileSchemaVersion;
    verifiedCertificates?: VerifiedCertificate[];
    seasonalExperience?: SeasonalExperience[];
    languageSkills?: LanguageSkill[];
  };
} | { ok: false; error: string } {
  const result: {
    profileSchemaVersion?: ProfileSchemaVersion;
    verifiedCertificates?: VerifiedCertificate[];
    seasonalExperience?: SeasonalExperience[];
    languageSkills?: LanguageSkill[];
  } = {};

  if (body.profileSchemaVersion !== undefined) {
    if (!isProfileSchemaVersion(body.profileSchemaVersion)) {
      return { ok: false, error: 'Invalid profileSchemaVersion' };
    }
    result.profileSchemaVersion = body.profileSchemaVersion;
  }

  if (body.verifiedCertificates !== undefined) {
    if (!Array.isArray(body.verifiedCertificates)) {
      return { ok: false, error: 'verifiedCertificates must be an array' };
    }
    const certs: VerifiedCertificate[] = [];
    for (const item of body.verifiedCertificates) {
      const parsed = validateVerifiedCertificate(item);
      if (!parsed.ok) return parsed;
      certs.push(parsed.value);
    }
    result.verifiedCertificates = certs;
  }

  if (body.seasonalExperience !== undefined) {
    if (!Array.isArray(body.seasonalExperience)) {
      return { ok: false, error: 'seasonalExperience must be an array' };
    }
    const entries: SeasonalExperience[] = [];
    for (const item of body.seasonalExperience) {
      const parsed = validateSeasonalExperience(item);
      if (!parsed.ok) return parsed;
      entries.push(parsed.value);
    }
    result.seasonalExperience = entries;
  }

  if (body.languageSkills !== undefined) {
    if (!Array.isArray(body.languageSkills)) {
      return { ok: false, error: 'languageSkills must be an array' };
    }
    const skills: LanguageSkill[] = [];
    for (const item of body.languageSkills) {
      const parsed = validateLanguageSkill(item);
      if (!parsed.ok) return parsed;
      skills.push(parsed.value);
    }
    result.languageSkills = skills;
  }

  return { ok: true, value: result };
}

export function normalizeCertificatesForSave(
  certificates: VerifiedCertificate[]
): VerifiedCertificate[] {
  return certificates.map((cert) => {
    const hasDocument = !!cert.documentUrl;
    let verificationStatus = cert.verificationStatus ?? 'unverified';
    if (hasDocument && verificationStatus === 'unverified') {
      verificationStatus = 'pending_review';
    }
    if (!hasDocument && verificationStatus === 'pending_review') {
      verificationStatus = 'unverified';
    }
    return { ...cert, verificationStatus };
  });
}
