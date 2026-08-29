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
  const originalEnabled = process.env.TALENT_NETWORK_ENABLED;
  const originalCutover = process.env.TALENT_NETWORK_CUTOVER;

  afterEach(() => {
    process.env.TALENT_NETWORK_ENABLED = originalEnabled;
    process.env.TALENT_NETWORK_CUTOVER = originalCutover;
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

  it('denies regular job seekers when cutover is off', () => {
    process.env.TALENT_NETWORK_ENABLED = 'true';
    process.env.TALENT_NETWORK_CUTOVER = 'false';
    expect(
      canUseTalentNetworkEditor({ role: 'job-seeker', talentNetworkBeta: false })
    ).toBe(false);
  });

  it('allows any job seeker when cutover is on', () => {
    process.env.TALENT_NETWORK_ENABLED = 'true';
    process.env.TALENT_NETWORK_CUTOVER = 'true';
    expect(
      canUseTalentNetworkEditor({ role: 'job-seeker', talentNetworkBeta: false })
    ).toBe(true);
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

  it('rejects seasonal experience when end date is before start date', () => {
    const result = validateSeasonalExperience({
      schoolName: 'Ion Club Tarifa',
      role: 'Senior Kite Instructor',
      startMonth: 10,
      startYear: 2024,
      endMonth: 5,
      endYear: 2024,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('End date must be on or after the start date');
    }
  });

  it('validates language skill', () => {
    const result = validateLanguageSkill({
      language: 'English',
      proficiency: 'professional',
    });
    expect(result.ok).toBe(true);
  });
});
