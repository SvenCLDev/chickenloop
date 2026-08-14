import {
  canUseTalentNetworkEditor,
  getTalentNetworkAccess,
  isTalentNetworkGloballyEnabled,
  shouldRenderTalentNetworkView,
} from '@/lib/talentNetwork/featureFlag';
import {
  validateLanguageSkill,
  validateSeasonalExperience,
  validateVerifiedCertificate,
} from '@/lib/talentNetwork/validators';

describe('talent network feature flags', () => {
  const originalEnv = process.env.TALENT_NETWORK_ENABLED;

  afterEach(() => {
    process.env.TALENT_NETWORK_ENABLED = originalEnv;
  });

  it('is disabled by default', () => {
    process.env.TALENT_NETWORK_ENABLED = 'false';
    expect(isTalentNetworkGloballyEnabled()).toBe(false);
  });

  it('allows admins when globally enabled', () => {
    process.env.TALENT_NETWORK_ENABLED = 'true';
    expect(canUseTalentNetworkEditor({ role: 'admin' })).toBe(true);
  });

  it('allows beta job seekers when globally enabled', () => {
    process.env.TALENT_NETWORK_ENABLED = 'true';
    expect(
      canUseTalentNetworkEditor({ role: 'job-seeker', talentNetworkBeta: true })
    ).toBe(true);
  });

  it('denies regular job seekers', () => {
    process.env.TALENT_NETWORK_ENABLED = 'true';
    expect(
      canUseTalentNetworkEditor({ role: 'job-seeker', talentNetworkBeta: false })
    ).toBe(false);
  });

  it('returns access summary for beta job seeker', () => {
    process.env.TALENT_NETWORK_ENABLED = 'true';
    expect(
      getTalentNetworkAccess({ role: 'job-seeker', talentNetworkBeta: true })
    ).toEqual({ enabled: true, canEdit: true });
  });

  it('renders v2 view only for schema version 2', () => {
    expect(shouldRenderTalentNetworkView(1)).toBe(false);
    expect(shouldRenderTalentNetworkView(2)).toBe(true);
  });
});

describe('talent network validators', () => {
  it('validates a certificate payload', () => {
    const result = validateVerifiedCertificate({
      issuingBody: 'IKO',
      certificateLevel: 'Level 2 Instructor',
      disciplines: ['Kitesurfing'],
      licenseMemberId: 'IKO-123',
      verificationStatus: 'unverified',
    });
    expect(result.ok).toBe(true);
  });

  it('accepts PASA as issuing body', () => {
    const result = validateVerifiedCertificate({
      issuingBody: 'PASA',
      certificateLevel: 'Level 1 Instructor',
      disciplines: ['Kitesurfing'],
      verificationStatus: 'unverified',
    });
    expect(result.ok).toBe(true);
  });

  it('accepts BKSA as issuing body', () => {
    const result = validateVerifiedCertificate({
      issuingBody: 'BKSA',
      certificateLevel: 'Level 1 Instructor',
      disciplines: ['Kitesurfing'],
      verificationStatus: 'unverified',
    });
    expect(result.ok).toBe(true);
  });

  it('rejects invalid certificate issuing body', () => {
    const result = validateVerifiedCertificate({
      issuingBody: 'INVALID',
      certificateLevel: 'Level 1',
      disciplines: [],
    });
    expect(result.ok).toBe(false);
  });

  it('validates seasonal experience', () => {
    const result = validateSeasonalExperience({
      schoolName: 'Ion Club Tarifa',
      role: 'Senior Kite Instructor',
      startMonth: 5,
      startYear: 2024,
      endMonth: 10,
      endYear: 2024,
      seasonTag: 'Summer 2024',
    });
    expect(result.ok).toBe(true);
  });

  it('validates language skill', () => {
    const result = validateLanguageSkill({
      language: 'English',
      proficiency: 'professional',
    });
    expect(result.ok).toBe(true);
  });
});
