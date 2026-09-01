import type { CandidateListItem } from '@/lib/candidateListTypes';

type VerifiedCertificateDoc = {
  verificationStatus?: string;
  issuingBody?: string;
  certificateLevel?: string;
};

type SeasonalExperienceDoc = {
  verificationStatus?: string;
};

type ObjectIdLike = string | { toString(): string };

type JobSeekerDoc = {
  _id?: ObjectIdLike;
  name?: string;
  email?: string;
  lastOnline?: string | Date;
  updatedAt?: string | Date;
};

export type CvDocumentForListItem = {
  _id: ObjectIdLike;
  fullName: string;
  summary?: string;
  address?: string;
  experienceAndSkill?: string[];
  lookingForWorkInAreas?: string[];
  languages?: string[];
  professionalCertifications?: string[];
  experienceLevel?: string;
  availability?: string;
  featured?: boolean;
  featuredUntil?: string | Date | null;
  pictures?: string[];
  profileSchemaVersion?: number;
  verifiedCertificates?: VerifiedCertificateDoc[];
  seasonalExperience?: SeasonalExperienceDoc[];
  jobSeeker?: JobSeekerDoc | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

function toIsoString(value: string | Date | undefined): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function formatVerifiedCertLabel(cert: VerifiedCertificateDoc): string {
  return `${cert.issuingBody ?? ''} ${cert.certificateLevel ?? ''}`.trim();
}

function isFeaturedCv(cv: CvDocumentForListItem): boolean {
  if (cv.featured === true) return true;
  if (cv.featuredUntil == null) return false;
  const until = cv.featuredUntil instanceof Date ? cv.featuredUntil : new Date(cv.featuredUntil);
  return !Number.isNaN(until.getTime()) && until > new Date();
}

function mapJobSeeker(jobSeeker: JobSeekerDoc | null | undefined): CandidateListItem['jobSeeker'] {
  if (!jobSeeker) return undefined;
  const id = jobSeeker._id != null ? String(jobSeeker._id) : undefined;
  if (!id || !jobSeeker.name || !jobSeeker.email) return undefined;
  return {
    _id: id,
    name: jobSeeker.name,
    email: jobSeeker.email,
    lastOnline: toIsoString(jobSeeker.lastOnline),
    updatedAt: toIsoString(jobSeeker.updatedAt),
  };
}

export function mapCvDocumentToCandidateListItem(cv: CvDocumentForListItem): CandidateListItem {
  const verifiedCerts = (cv.verifiedCertificates ?? []).filter(
    (cert) => cert.verificationStatus === 'verified'
  );
  const confirmedReferences = (cv.seasonalExperience ?? []).filter(
    (exp) => exp.verificationStatus === 'confirmed'
  );

  return {
    _id: String(cv._id),
    fullName: cv.fullName,
    summary: cv.summary,
    address: cv.address,
    experienceAndSkill: cv.experienceAndSkill ?? [],
    lookingForWorkInAreas: cv.lookingForWorkInAreas ?? [],
    languages: cv.languages ?? [],
    professionalCertifications: cv.professionalCertifications ?? [],
    experienceLevel: cv.experienceLevel,
    availability: cv.availability,
    featured: isFeaturedCv(cv),
    pictures: cv.pictures ?? [],
    profileSchemaVersion: cv.profileSchemaVersion,
    verifiedCertCount: verifiedCerts.length,
    confirmedReferenceCount: confirmedReferences.length,
    verifiedCertLabels: verifiedCerts.slice(0, 2).map(formatVerifiedCertLabel).filter(Boolean),
    jobSeeker: mapJobSeeker(cv.jobSeeker),
    createdAt: toIsoString(cv.createdAt),
    updatedAt: toIsoString(cv.updatedAt),
  };
}
