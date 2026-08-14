import type {
  LanguageSkill,
  SeasonalExperience,
  VerifiedCertificate,
} from './types';
import { ISSUING_BODY_LABELS } from './constants';

function monthYearToDate(month: number, year: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

export function syncLegacyFieldsFromTalentNetwork(input: {
  verifiedCertificates?: VerifiedCertificate[];
  seasonalExperience?: SeasonalExperience[];
  languageSkills?: LanguageSkill[];
}): {
  professionalCertifications: string[];
  certifications: string[];
  experience: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate?: string;
    description?: string;
  }>;
  languages: string[];
} {
  const professionalCertifications: string[] = [];
  const certifications: string[] = [];

  for (const cert of input.verifiedCertificates ?? []) {
    const bodyLabel = ISSUING_BODY_LABELS[cert.issuingBody] ?? cert.issuingBody;
    const label = `${bodyLabel} ${cert.certificateLevel}`.trim();
    if (cert.issuingBody === 'OTHER') {
      certifications.push(label);
    } else {
      professionalCertifications.push(label);
    }
  }

  const experience = (input.seasonalExperience ?? []).map((entry) => {
    const startDate = monthYearToDate(entry.startMonth, entry.startYear);
    const endDate =
      entry.endMonth && entry.endYear
        ? monthYearToDate(entry.endMonth, entry.endYear)
        : undefined;
    const descriptionParts = [entry.seasonTag].filter(Boolean);
    return {
      company: entry.schoolName,
      position: entry.role,
      startDate,
      endDate,
      description: descriptionParts.length ? descriptionParts.join(' — ') : undefined,
    };
  });

  const languages = (input.languageSkills ?? []).map((skill) => skill.language);

  return {
    professionalCertifications,
    certifications,
    experience,
    languages,
  };
}
