import type {
  IssuingBody,
  LanguageProficiency,
  LanguageSkill,
  SeasonalExperience,
  VerifiedCertificate,
  WorkAuthorizationStatus,
} from '@/lib/talentNetwork/types';

export interface TalentNetworkFormState {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  summary: string;
  verifiedCertificates: VerifiedCertificateFormEntry[];
  seasonalExperience: SeasonalExperienceFormEntry[];
  languageSkills: LanguageSkillFormEntry[];
  experienceAndSkill: string[];
  lookingForWorkInAreas: string[];
  experienceLevel: '' | 'entry' | 'intermediate' | 'experienced' | 'senior';
  availability: '' | 'available_now' | 'available_soon' | 'seasonal' | 'not_available';
  nationalityCountry: string;
  preferredWorkCountries: string[];
  workEligibleCountries: string[];
  euEeaWorkRights: boolean;
  workAuthorizations: WorkAuthorizationFormEntry[];
  published?: boolean;
}

export interface VerifiedCertificateFormEntry {
  clientId: string;
  issuingBody: IssuingBody | '';
  certificateLevel: string;
  disciplines: string[];
  licenseMemberId: string;
  issueDate: string;
  expiryDate: string;
  documentUrl: string;
  verificationStatus?: VerifiedCertificate['verificationStatus'];
}

export interface SeasonalExperienceFormEntry {
  clientId: string;
  schoolName: string;
  role: string;
  startMonth: number | '';
  startYear: number | '';
  endMonth: number | '';
  endYear: number | '';
  seasonTag: string;
  referenceName: string;
  referenceEmail: string;
  referencePhone: string;
  verificationStatus?: SeasonalExperience['verificationStatus'];
}

export interface LanguageSkillFormEntry {
  clientId: string;
  language: string;
  proficiency: LanguageProficiency | '';
  verificationStatus?: LanguageSkill['verificationStatus'];
}

export interface WorkAuthorizationFormEntry {
  clientId: string;
  country: string;
  status: WorkAuthorizationStatus | '';
  permitType: string;
  validUntil: string;
  notes: string;
}

export function createClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyCertificate(): VerifiedCertificateFormEntry {
  return {
    clientId: createClientId(),
    issuingBody: '',
    certificateLevel: '',
    disciplines: [],
    licenseMemberId: '',
    issueDate: '',
    expiryDate: '',
    documentUrl: '',
    verificationStatus: 'unverified',
  };
}

export function emptySeasonalExperience(): SeasonalExperienceFormEntry {
  return {
    clientId: createClientId(),
    schoolName: '',
    role: '',
    startMonth: '',
    startYear: '',
    endMonth: '',
    endYear: '',
    seasonTag: '',
    referenceName: '',
    referenceEmail: '',
    referencePhone: '',
    verificationStatus: 'self_reported',
  };
}

export function emptyLanguageSkill(): LanguageSkillFormEntry {
  return {
    clientId: createClientId(),
    language: '',
    proficiency: '',
    verificationStatus: 'self_assessed',
  };
}

export function emptyWorkAuthorization(): WorkAuthorizationFormEntry {
  return {
    clientId: createClientId(),
    country: '',
    status: '',
    permitType: '',
    validUntil: '',
    notes: '',
  };
}

export function emptyTalentNetworkForm(): TalentNetworkFormState {
  return {
    fullName: '',
    email: '',
    phone: '',
    address: '',
    summary: '',
    verifiedCertificates: [emptyCertificate()],
    seasonalExperience: [emptySeasonalExperience()],
    languageSkills: [emptyLanguageSkill()],
    experienceAndSkill: [],
    lookingForWorkInAreas: [],
    experienceLevel: '',
    availability: '',
    nationalityCountry: '',
    preferredWorkCountries: [],
    workEligibleCountries: [],
    euEeaWorkRights: false,
    workAuthorizations: [],
  };
}
