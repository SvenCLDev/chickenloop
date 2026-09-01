export interface CandidateListItem {
  _id: string;
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
  pictures?: string[];
  profileSchemaVersion?: number;
  verifiedCertCount?: number;
  confirmedReferenceCount?: number;
  verifiedCertLabels?: string[];
  jobSeeker?: {
    _id: string;
    name: string;
    email: string;
    lastOnline?: string;
    updatedAt?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CandidateFilterOptions {
  languages: string[];
  workAreas: string[];
  sports: string[];
  certifications: string[];
  experienceLevels: string[];
  availability: string[];
  preferredCountries: string[];
  eligibleCountries: string[];
}
