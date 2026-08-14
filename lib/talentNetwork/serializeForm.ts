import type { TalentNetworkFormState } from '@/app/components/talentNetwork/formTypes';

export function serializeTalentNetworkForm(
  form: TalentNetworkFormState,
  pictures: string[]
): Record<string, unknown> {
  return {
    fullName: form.fullName,
    email: form.email,
    phone: form.phone || undefined,
    address: form.address || undefined,
    summary: form.summary || undefined,
    experienceAndSkill: form.experienceAndSkill,
    lookingForWorkInAreas: form.lookingForWorkInAreas,
    experienceLevel: form.experienceLevel || undefined,
    availability: form.availability || undefined,
    pictures,
    published: form.published,
    profileSchemaVersion: 2,
    verifiedCertificates: form.verifiedCertificates
      .filter((c) => c.issuingBody && c.certificateLevel)
      .map((c) => ({
        issuingBody: c.issuingBody,
        certificateLevel: c.certificateLevel,
        disciplines: c.disciplines,
        licenseMemberId: c.licenseMemberId || undefined,
        issueDate: c.issueDate || undefined,
        expiryDate: c.expiryDate || undefined,
        documentUrl: c.documentUrl || undefined,
        verificationStatus: c.verificationStatus ?? 'unverified',
      })),
    seasonalExperience: form.seasonalExperience
      .filter((e) => e.schoolName && e.role && e.startMonth && e.startYear)
      .map((e) => ({
        schoolName: e.schoolName,
        role: e.role,
        startMonth: e.startMonth,
        startYear: e.startYear,
        endMonth: e.endMonth || null,
        endYear: e.endYear || null,
        seasonTag: e.seasonTag || undefined,
        referenceName: e.referenceName || undefined,
        referenceEmail: e.referenceEmail || undefined,
        referencePhone: e.referencePhone || undefined,
        verificationStatus: e.verificationStatus ?? 'self_reported',
      })),
    languageSkills: form.languageSkills
      .filter((s) => s.language && s.proficiency)
      .map((s) => ({
        language: s.language,
        proficiency: s.proficiency,
        verificationStatus: s.verificationStatus ?? 'self_assessed',
      })),
  };
}

export function cvToTalentNetworkForm(cv: Record<string, unknown>): TalentNetworkFormState {
  const certs = (cv.verifiedCertificates as Record<string, unknown>[] | undefined) ?? [];
  const experience = (cv.seasonalExperience as Record<string, unknown>[] | undefined) ?? [];
  const languages = (cv.languageSkills as Record<string, unknown>[] | undefined) ?? [];

  return {
    fullName: String(cv.fullName ?? ''),
    email: String(cv.email ?? ''),
    phone: String(cv.phone ?? ''),
    address: String(cv.address ?? ''),
    summary: String(cv.summary ?? ''),
    verifiedCertificates:
      certs.length > 0
        ? certs.map((c, i) => ({
            clientId: String(c._id ?? `cert-${i}`),
            issuingBody: (c.issuingBody as TalentNetworkFormState['verifiedCertificates'][0]['issuingBody']) ?? '',
            certificateLevel: String(c.certificateLevel ?? ''),
            disciplines: (c.disciplines as string[]) ?? [],
            licenseMemberId: String(c.licenseMemberId ?? ''),
            issueDate: c.issueDate ? String(c.issueDate).slice(0, 10) : '',
            expiryDate: c.expiryDate ? String(c.expiryDate).slice(0, 10) : '',
            documentUrl: String(c.documentUrl ?? ''),
            verificationStatus: c.verificationStatus as TalentNetworkFormState['verifiedCertificates'][0]['verificationStatus'],
          }))
        : [],
    seasonalExperience:
      experience.length > 0
        ? experience.map((e, i) => ({
            clientId: String(e._id ?? `exp-${i}`),
            schoolName: String(e.schoolName ?? ''),
            role: String(e.role ?? ''),
            startMonth: typeof e.startMonth === 'number' ? e.startMonth : '',
            startYear: typeof e.startYear === 'number' ? e.startYear : '',
            endMonth: typeof e.endMonth === 'number' ? e.endMonth : '',
            endYear: typeof e.endYear === 'number' ? e.endYear : '',
            seasonTag: String(e.seasonTag ?? ''),
            referenceName: String(e.referenceName ?? ''),
            referenceEmail: String(e.referenceEmail ?? ''),
            referencePhone: String(e.referencePhone ?? ''),
            verificationStatus: e.verificationStatus as TalentNetworkFormState['seasonalExperience'][0]['verificationStatus'],
          }))
        : [],
    languageSkills:
      languages.length > 0
        ? languages.map((l, i) => ({
            clientId: String(l._id ?? `lang-${i}`),
            language: String(l.language ?? ''),
            proficiency: (l.proficiency as TalentNetworkFormState['languageSkills'][0]['proficiency']) ?? '',
            verificationStatus: l.verificationStatus as TalentNetworkFormState['languageSkills'][0]['verificationStatus'],
          }))
        : [],
    experienceAndSkill: (cv.experienceAndSkill as string[]) ?? [],
    lookingForWorkInAreas: (cv.lookingForWorkInAreas as string[]) ?? [],
    experienceLevel: (cv.experienceLevel as TalentNetworkFormState['experienceLevel']) ?? '',
    availability: (cv.availability as TalentNetworkFormState['availability']) ?? '',
    published: cv.published !== false,
  };
}
