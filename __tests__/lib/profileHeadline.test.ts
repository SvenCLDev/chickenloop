import {
  buildDeterministicProfileHeadline,
  getDisplayHeadline,
  sanitizeProfileHeadline,
} from '@/lib/talentNetwork/profileHeadline';
import { applyProfileHeadlineRules } from '@/lib/talentNetwork/applyProfileHeadline';

jest.mock('@/lib/ai/generateProfileHeadline', () => ({
  generateProfileHeadline: jest.fn(async () => ({
    headline: 'AI Generated Headline',
    source: 'ai' as const,
  })),
}));

import { generateProfileHeadline } from '@/lib/ai/generateProfileHeadline';

const mockedGenerate = generateProfileHeadline as jest.MockedFunction<
  typeof generateProfileHeadline
>;

function makeCv(overrides: Record<string, unknown> = {}) {
  return {
    lookingForWorkInAreas: ['Instruction'],
    experienceAndSkill: ['kitesurfing'],
    verifiedCertificates: [],
    seasonalExperience: [],
    profileHeadline: undefined,
    profileHeadlineSource: undefined,
    profileHeadlineUpdatedAt: undefined,
    ...overrides,
  } as any;
}

describe('sanitizeProfileHeadline', () => {
  it('trims, strips quotes, and clamps to 80 chars', () => {
    expect(sanitizeProfileHeadline('  "Kitesurf Instructor"  ')).toBe(
      'Kitesurf Instructor'
    );
    expect(sanitizeProfileHeadline('line1\nline2')).toBe('line1 line2');
    const long = 'A'.repeat(100);
    expect(sanitizeProfileHeadline(long)?.length).toBe(80);
  });

  it('rejects empty / non-string', () => {
    expect(sanitizeProfileHeadline('')).toBeNull();
    expect(sanitizeProfileHeadline('   ')).toBeNull();
    expect(sanitizeProfileHeadline(null)).toBeNull();
    expect(sanitizeProfileHeadline(42)).toBeNull();
  });
});

describe('buildDeterministicProfileHeadline', () => {
  it('maps one sport + Instruction to Instructor headline', () => {
    expect(
      buildDeterministicProfileHeadline({
        lookingForWorkInAreas: ['Instruction'],
        experienceAndSkill: ['kitesurfing'],
      })
    ).toBe('Kitesurf Instructor');
  });

  it('maps multi-sport + Instruction', () => {
    expect(
      buildDeterministicProfileHeadline({
        lookingForWorkInAreas: ['Instruction'],
        experienceAndSkill: ['kitesurfing', 'wing foiling'],
      })
    ).toBe('Kitesurf & Wingfoil Instructor');
  });

  it('maps management + sport', () => {
    expect(
      buildDeterministicProfileHeadline({
        lookingForWorkInAreas: ['Management'],
        experienceAndSkill: ['surfing'],
      })
    ).toBe('Surf & Centre Manager');
  });

  it('falls back to Watersports Professional when empty', () => {
    expect(buildDeterministicProfileHeadline({})).toBe('Watersports Professional');
  });
});

describe('getDisplayHeadline', () => {
  it('prefers stored headline over fallback', () => {
    expect(
      getDisplayHeadline({
        profileHeadline: 'Custom Headline',
        lookingForWorkInAreas: ['Instruction'],
        experienceAndSkill: ['kitesurfing'],
      })
    ).toBe('Custom Headline');
  });

  it('uses deterministic fallback when no stored headline', () => {
    expect(
      getDisplayHeadline({
        lookingForWorkInAreas: ['Instruction'],
        experienceAndSkill: ['kitesurfing'],
      })
    ).toBe('Kitesurf Instructor');
  });
});

describe('applyProfileHeadlineRules manual source guard', () => {
  beforeEach(() => {
    mockedGenerate.mockClear();
    mockedGenerate.mockResolvedValue({
      headline: 'AI Generated Headline',
      source: 'ai',
    });
  });

  it('never overwrites a manual headline when sports change', async () => {
    const cv = makeCv({
      profileHeadline: 'My Custom Title',
      profileHeadlineSource: 'manual',
      profileHeadlineUpdatedAt: new Date('2024-01-01'),
      lookingForWorkInAreas: ['Instruction'],
      experienceAndSkill: ['surfing'],
    });

    const result = await applyProfileHeadlineRules(cv, {}, {
      mode: 'update',
      previousInputs: {
        lookingForWorkInAreas: ['Instruction'],
        experienceAndSkill: ['kitesurfing'],
      },
    });

    expect(result).toEqual({ ok: true });
    expect(cv.profileHeadline).toBe('My Custom Title');
    expect(cv.profileHeadlineSource).toBe('manual');
    expect(mockedGenerate).not.toHaveBeenCalled();
  });

  it('marks client-edited headline as manual', async () => {
    const cv = makeCv({
      profileHeadline: 'AI Generated Headline',
      profileHeadlineSource: 'ai',
    });

    const result = await applyProfileHeadlineRules(
      cv,
      { profileHeadline: 'Edited By Hand' },
      { mode: 'update' }
    );

    expect(result).toEqual({ ok: true });
    expect(cv.profileHeadline).toBe('Edited By Hand');
    expect(cv.profileHeadlineSource).toBe('manual');
    expect(mockedGenerate).not.toHaveBeenCalled();
  });

  it('keeps source ai when client re-saves the same AI headline', async () => {
    const cv = makeCv({
      profileHeadline: 'AI Generated Headline',
      profileHeadlineSource: 'ai',
      profileHeadlineUpdatedAt: new Date('2024-01-01'),
    });

    const result = await applyProfileHeadlineRules(
      cv,
      { profileHeadline: 'AI Generated Headline' },
      { mode: 'update' }
    );

    expect(result).toEqual({ ok: true });
    expect(cv.profileHeadlineSource).toBe('ai');
  });

  it('regenerates when source is ai and inputs change', async () => {
    const cv = makeCv({
      profileHeadline: 'Old AI Title',
      profileHeadlineSource: 'ai',
      experienceAndSkill: ['surfing'],
    });

    const result = await applyProfileHeadlineRules(cv, {}, {
      mode: 'update',
      previousInputs: {
        lookingForWorkInAreas: ['Instruction'],
        experienceAndSkill: ['kitesurfing'],
      },
    });

    expect(result).toEqual({ ok: true });
    expect(mockedGenerate).toHaveBeenCalled();
    expect(cv.profileHeadline).toBe('AI Generated Headline');
    expect(cv.profileHeadlineSource).toBe('ai');
  });
});
