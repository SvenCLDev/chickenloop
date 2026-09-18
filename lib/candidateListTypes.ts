export interface CandidateListItem {
  _id: string;
  fullName: string;
  /** Prefers anonymized label for anonymous viewers when set by API. */
  displayName?: string;
  summary?: string;
  address?: string;
  /** Country/region code for non-recruiter “Based in” without full address. */
  regionLabel?: string;
  /** When false, list cards should not deep-link to profile detail. */
  profileLinkAllowed?: boolean;
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
  nationalityCountry?: string;
  preferredWorkCountries?: string[];
  workEligibleCountries?: string[];
  jobSeeker?: {
    _id: string;
    name?: string;
    email?: string;
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
