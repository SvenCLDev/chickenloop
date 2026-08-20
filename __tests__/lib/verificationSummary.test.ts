import { buildTalentNetworkVerificationSummary } from '@/lib/talentNetwork/verificationSummary';

describe('buildTalentNetworkVerificationSummary', () => {
  it('summarizes pending and verified items for owner view', () => {
    const summary = buildTalentNetworkVerificationSummary({
      verifiedCertificates: [
        {
          issuingBody: 'IKO',
          certificateLevel: 'Level 2',
          verificationStatus: 'verified',
          disciplines: [],
        },
        {
          issuingBody: 'PADI',
          certificateLevel: 'OWSI',
          verificationStatus: 'pending_review',
          disciplines: [],
        },
      ],
      seasonalExperience: [
        {
          schoolName: 'Ion Club',
          role: 'Instructor',
          startMonth: 5,
          startYear: 2024,
          verificationStatus: 'reference_confirmed',
        },
        {
          schoolName: 'Wind Paradise',
          role: 'Senior Instructor',
          startMonth: 6,
          startYear: 2023,
          verificationStatus: 'reference_disputed',
          referenceEmail: 'manager@example.com',
        },
        {
          schoolName: 'Beach Club',
          role: 'Coach',
          startMonth: 7,
          startYear: 2022,
          verificationStatus: 'reference_requested',
          referenceEmail: 'coach@example.com',
        },
      ],
      languageSkills: [
        { language: 'English', proficiency: 'professional', verificationStatus: 'self_assessed' },
      ],
    });

    expect(summary.certificates.verified).toBe(1);
    expect(summary.certificates.pendingReview).toBe(1);
    expect(summary.references.confirmed).toBe(1);
    expect(summary.references.disputed).toBe(1);
    expect(summary.references.requested).toBe(1);
    expect(summary.verifiedItems.some((item) => item.includes('Chickenloop verified'))).toBe(true);
    expect(summary.pendingItems.some((item) => item.includes('pending admin review'))).toBe(true);
    expect(summary.pendingItems.some((item) => item.includes('awaiting manager response'))).toBe(true);
    expect(summary.pendingItems.some((item) => item.includes('did not work there'))).toBe(true);
  });
});
