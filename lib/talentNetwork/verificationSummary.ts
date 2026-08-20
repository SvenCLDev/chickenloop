import type {
  CertificateVerificationStatus,
  ExperienceVerificationStatus,
  LanguageVerificationStatus,
  LanguageSkill,
  SeasonalExperience,
  VerifiedCertificate,
} from './types';

export interface VerificationSummary {
  certificates: {
    verified: number;
    pendingReview: number;
    unverified: number;
  };
  references: {
    confirmed: number;
    disputed: number;
    requested: number;
    selfReported: number;
  };
  languages: {
    endorsed: number;
    selfAssessed: number;
  };
  pendingItems: string[];
  verifiedItems: string[];
}

function certLabel(cert: VerifiedCertificate, index: number): string {
  const level = cert.certificateLevel?.trim() || `Certificate ${index + 1}`;
  return `${cert.issuingBody} ${level}`.trim();
}

function experienceLabel(entry: SeasonalExperience, index: number): string {
  const role = entry.role?.trim() || 'Role';
  const school = entry.schoolName?.trim() || `Experience ${index + 1}`;
  return `${role} at ${school}`;
}

function languageLabel(skill: LanguageSkill): string {
  return skill.language?.trim() || 'Language';
}

export function buildTalentNetworkVerificationSummary(cv: {
  verifiedCertificates?: VerifiedCertificate[];
  seasonalExperience?: SeasonalExperience[];
  languageSkills?: LanguageSkill[];
}): VerificationSummary {
  const certs = cv.verifiedCertificates ?? [];
  const experience = cv.seasonalExperience ?? [];
  const languages = cv.languageSkills ?? [];

  const certificates = {
    verified: certs.filter((c) => c.verificationStatus === 'verified').length,
    pendingReview: certs.filter((c) => c.verificationStatus === 'pending_review').length,
    unverified: certs.filter((c) => (c.verificationStatus ?? 'unverified') === 'unverified').length,
  };

  const references = {
    confirmed: experience.filter((e) => e.verificationStatus === 'reference_confirmed').length,
    disputed: experience.filter((e) => e.verificationStatus === 'reference_disputed').length,
    requested: experience.filter((e) => e.verificationStatus === 'reference_requested').length,
    selfReported: experience.filter(
      (e) => (e.verificationStatus ?? 'self_reported') === 'self_reported'
    ).length,
  };

  const languagesSummary = {
    endorsed: languages.filter((l) => l.verificationStatus === 'endorsed').length,
    selfAssessed: languages.filter(
      (l) => (l.verificationStatus ?? 'self_assessed') === 'self_assessed'
    ).length,
  };

  const pendingItems: string[] = [];
  const verifiedItems: string[] = [];

  certs.forEach((cert, index) => {
    const label = certLabel(cert, index);
    const status = (cert.verificationStatus ?? 'unverified') as CertificateVerificationStatus;
    if (status === 'verified') {
      verifiedItems.push(`${label} — Chickenloop verified`);
    } else if (status === 'pending_review') {
      pendingItems.push(`${label} — pending admin review`);
    } else {
      pendingItems.push(`${label} — not yet submitted for verification`);
    }
  });

  experience.forEach((entry, index) => {
    const label = experienceLabel(entry, index);
    const status = (entry.verificationStatus ?? 'self_reported') as ExperienceVerificationStatus;
    if (status === 'reference_confirmed') {
      verifiedItems.push(`${label} — verified reference`);
    } else if (status === 'reference_disputed') {
      pendingItems.push(`${label} — manager says they did not work there`);
    } else if (status === 'reference_requested') {
      pendingItems.push(`${label} — reference email sent, awaiting manager response`);
    } else if (entry.referenceEmail?.trim()) {
      pendingItems.push(`${label} — manager email saved, reference not yet confirmed`);
    } else {
      pendingItems.push(`${label} — self-reported only (add manager email to verify)`);
    }
  });

  languages.forEach((skill) => {
    const label = languageLabel(skill);
    const status = (skill.verificationStatus ?? 'self_assessed') as LanguageVerificationStatus;
    if (status === 'endorsed') {
      verifiedItems.push(`${label} — endorsed`);
    } else {
      pendingItems.push(`${label} — self-assessed`);
    }
  });

  return {
    certificates,
    references,
    languages: languagesSummary,
    pendingItems,
    verifiedItems,
  };
}
