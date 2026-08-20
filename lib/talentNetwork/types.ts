import type mongoose from 'mongoose';

export type ProfileSchemaVersion = 1 | 2;

export const ISSUING_BODIES = [
  'IKO',
  'VDWS',
  'RYA',
  'VDWS_WWS',
  'SSI',
  'PADI',
  'PASA',
  'BKSA',
  'OTHER',
] as const;
export type IssuingBody = (typeof ISSUING_BODIES)[number];

export const WATERSPORT_DISCIPLINES = [
  'Kitesurfing',
  'Wingfoiling',
  'Windsurfing',
  'SUP',
  'Sailing',
  'Surfing',
  'Wakeboarding',
  'Scuba Diving',
] as const;
export type WatersportDiscipline = (typeof WATERSPORT_DISCIPLINES)[number];

export const CERTIFICATE_VERIFICATION_STATUSES = [
  'unverified',
  'pending_review',
  'verified',
] as const;
export type CertificateVerificationStatus =
  (typeof CERTIFICATE_VERIFICATION_STATUSES)[number];

export const EXPERIENCE_VERIFICATION_STATUSES = [
  'self_reported',
  'reference_requested',
  'reference_confirmed',
  'reference_disputed',
] as const;
export type ExperienceVerificationStatus =
  (typeof EXPERIENCE_VERIFICATION_STATUSES)[number];

export const LANGUAGE_PROFICIENCIES = [
  'native',
  'professional',
  'conversational',
  'basic',
] as const;
export type LanguageProficiency = (typeof LANGUAGE_PROFICIENCIES)[number];

export const LANGUAGE_VERIFICATION_STATUSES = [
  'self_assessed',
  'endorsed',
] as const;
export type LanguageVerificationStatus =
  (typeof LANGUAGE_VERIFICATION_STATUSES)[number];

export interface VerifiedCertificate {
  _id?: mongoose.Types.ObjectId;
  issuingBody: IssuingBody;
  certificateLevel: string;
  disciplines: string[];
  licenseMemberId?: string;
  issueDate?: Date | string;
  expiryDate?: Date | string;
  documentUrl?: string;
  verificationStatus: CertificateVerificationStatus;
  verifiedAt?: Date | string;
  verifiedBy?: mongoose.Types.ObjectId | string;
  adminNote?: string;
  legacySource?: string;
}

export interface SeasonalExperience {
  _id?: mongoose.Types.ObjectId;
  schoolName: string;
  role: string;
  startMonth: number;
  startYear: number;
  endMonth?: number | null;
  endYear?: number | null;
  seasonTag?: string;
  referenceName?: string;
  referenceEmail?: string;
  referencePhone?: string;
  verificationStatus: ExperienceVerificationStatus;
  referenceTokenId?: mongoose.Types.ObjectId | string;
  workConfirmed?: boolean;
  rehireAnswer?: boolean;
  lastReferenceEmailSentAt?: Date | string;
}

export interface LanguageSkill {
  _id?: mongoose.Types.ObjectId;
  language: string;
  proficiency: LanguageProficiency;
  verificationStatus: LanguageVerificationStatus;
}

export interface TalentNetworkUserContext {
  role?: string | null;
  talentNetworkBeta?: boolean;
}

export interface TalentNetworkCvFields {
  profileSchemaVersion?: ProfileSchemaVersion;
  verifiedCertificates?: VerifiedCertificate[];
  seasonalExperience?: SeasonalExperience[];
  languageSkills?: LanguageSkill[];
}
