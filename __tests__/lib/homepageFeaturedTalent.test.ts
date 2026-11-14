import {
  clearHomepageFeaturedTalentCache,
  getEligibilityFailure,
  isEligibleForFeaturedTalent,
  rankEligibleTalent,
  scoreActivity,
  scoreAvailability,
  scoreCompleteness,
  scoreCredentials,
  scoreExperience,
  scoreTalent,
  selectHomepageFeaturedTalent,
  selectWithDiversity,
  type TalentScoreInput,
} from '@/lib/homepageFeaturedTalent';

function baseTalent(overrides: Partial<TalentScoreInput> = {}): TalentScoreInput {
  return {
    _id: 'a00000000000000000000001',
    fullName: 'Alex Rider',
    published: true,
    pictures: ['https://example.com/a.jpg'],
    profileHeadline: 'Kitesurf Instructor',
    summary: 'Experienced watersports instructor with seasonal centre work.',
    availability: 'available_now',
    lookingForWorkInAreas: ['Instruction'],
    experienceAndSkill: ['kitesurfing'],
    nationalityCountry: 'PT',
    languageSkills: [{ language: 'English' }],
    professionalProfileUpdatedAt: new Date('2026-10-20'),
    seasonalExperience: [
      {
        schoolName: 'Tarifa Kite School',
        role: 'Instructor',
        startMonth: 5,
        startYear: 2024,
      },
    ],
    ...overrides,
  };
}

describe('scoreAvailability', () => {
  it('maps available_now to 40', () => {
    expect(scoreAvailability('available_now')).toBe(40);
  });

  it('maps available_soon to 35', () => {
    expect(scoreAvailability('available_soon')).toBe(35);
  });

  it('maps seasonal to 25', () => {
    expect(scoreAvailability('seasonal')).toBe(25);
  });

  it('maps not_available and missing to 0', () => {
    expect(scoreAvailability('not_available')).toBe(0);
    expect(scoreAvailability(undefined)).toBe(0);
  });
});

describe('eligibility', () => {
  it('accepts available-now complete profiles', () => {
    expect(isEligibleForFeaturedTalent(baseTalent())).toBe(true);
  });

  it('excludes profiles without an image', () => {
    expect(getEligibilityFailure(baseTalent({ pictures: [] }))).toBe('no_image');
  });

  it('excludes unpublished profiles', () => {
    expect(getEligibilityFailure(baseTalent({ published: false }))).toBe(
      'unpublished'
    );
  });

  it('excludes incomplete profiles', () => {
    expect(
      getEligibilityFailure(
        baseTalent({
          profileHeadline: '',
          experienceAndSkill: [],
          lookingForWorkInAreas: [],
          summary: '',
          seasonalExperience: [],
        })
      )
    ).toBe('insufficient_headline');
  });

  it('keeps unknown availability eligible when otherwise complete', () => {
    expect(
      isEligibleForFeaturedTalent(baseTalent({ availability: undefined }))
    ).toBe(true);
  });

  it('keeps not_available eligible when otherwise complete', () => {
    expect(
      isEligibleForFeaturedTalent(baseTalent({ availability: 'not_available' }))
    ).toBe(true);
  });
});

describe('scoring bands', () => {
  const now = new Date('2026-11-14').getTime();

  it('scores available now + complete profile highly', () => {
    const { total, parts } = scoreTalent(baseTalent(), now);
    expect(parts.availability).toBe(40);
    expect(parts.completeness).toBeGreaterThanOrEqual(20);
    expect(total).toBeGreaterThanOrEqual(60);
  });

  it('scores available_soon as 35 availability', () => {
    const { parts } = scoreTalent(
      baseTalent({ availability: 'available_soon' }),
      now
    );
    expect(parts.availability).toBe(35);
  });

  it('gives unknown availability 0 but still scores other bands', () => {
    const { parts, total } = scoreTalent(
      baseTalent({ availability: undefined }),
      now
    );
    expect(parts.availability).toBe(0);
    expect(total).toBe(parts.completeness + parts.credentials + parts.activity + parts.experience);
  });

  it('rewards recent professionalProfileUpdatedAt, not generic updatedAt', () => {
    expect(
      scoreActivity(new Date('2026-11-01'), now)
    ).toBe(15);
    expect(
      scoreActivity(new Date('2026-01-01'), now)
    ).toBe(0);
    // Missing professional clock → 0 even if updatedAt would be fresh
    expect(scoreActivity(undefined, now)).toBe(0);
  });

  it('scores credentials for verified known bodies without over-counting', () => {
    expect(
      scoreCredentials(
        baseTalent({
          verifiedCertificates: [
            {
              issuingBody: 'IKO',
              certificateLevel: 'Level 2',
              verificationStatus: 'verified',
            },
          ],
        })
      )
    ).toBe(10);

    expect(
      scoreCredentials(
        baseTalent({
          verifiedCertificates: [
            {
              issuingBody: 'IKO',
              certificateLevel: 'L2',
              verificationStatus: 'verified',
            },
            {
              issuingBody: 'VDWS',
              certificateLevel: 'Instructor',
              verificationStatus: 'verified',
            },
          ],
        })
      )
    ).toBe(15);

    expect(
      scoreCredentials(
        baseTalent({
          verifiedCertificates: [
            {
              issuingBody: 'IKO',
              certificateLevel: 'L2',
              verificationStatus: 'unverified',
            },
          ],
        })
      )
    ).toBe(5);
  });

  it('scores seasonal experience by complete entry count', () => {
    expect(scoreExperience(baseTalent({ seasonalExperience: [] }))).toBe(0);
    expect(
      scoreExperience(
        baseTalent({
          seasonalExperience: [
            {
              schoolName: 'A',
              role: 'Instructor',
              startMonth: 1,
              startYear: 2023,
            },
          ],
        })
      )
    ).toBe(2);
    expect(
      scoreExperience(
        baseTalent({
          seasonalExperience: [
            {
              schoolName: 'A',
              role: 'Instructor',
              startMonth: 1,
              startYear: 2022,
              verificationStatus: 'reference_confirmed',
            },
            {
              schoolName: 'B',
              role: 'Manager',
              startMonth: 5,
              startYear: 2023,
            },
            {
              schoolName: 'C',
              role: 'Coach',
              startMonth: 6,
              startYear: 2024,
            },
          ],
        })
      )
    ).toBe(5);
  });

  it('scores completeness from useful recruiter fields', () => {
    expect(
      scoreCompleteness(
        baseTalent({
          profileHeadline: 'Instructor',
          experienceAndSkill: ['surfing'],
          lookingForWorkInAreas: ['Instruction'],
          address: 'Lagos',
          nationalityCountry: 'PT',
          languageSkills: [{ language: 'English' }],
          summary: 'A'.repeat(50),
        })
      )
    ).toBe(25);
  });
});

describe('selection and diversity', () => {
  it('returns all when fewer than six eligible', () => {
    const inputs = [
      baseTalent({ _id: '1', experienceAndSkill: ['kitesurfing'] }),
      baseTalent({
        _id: '2',
        experienceAndSkill: ['surfing'],
        nationalityCountry: 'ES',
      }),
    ];
    const { cards } = selectHomepageFeaturedTalent(inputs, 6);
    expect(cards).toHaveLength(2);
  });

  it('includes availability and sports on card payload for UI chips', () => {
    const { cards } = selectHomepageFeaturedTalent(
      [
        baseTalent({
          _id: '1',
          availability: 'available_soon',
          experienceAndSkill: ['kitesurfing', 'wing foiling', 'surfing', 'kayaking'],
        }),
      ],
      6
    );
    expect(cards).toHaveLength(1);
    expect(cards[0].availability).toBe('available_soon');
    expect(cards[0].experienceAndSkill).toEqual([
      'kitesurfing',
      'wing foiling',
      'surfing',
      'kayaking',
    ]);
  });

  it('returns exactly six when more than six eligible', () => {
    const inputs = Array.from({ length: 10 }, (_, i) =>
      baseTalent({
        _id: String(i).padStart(24, '0'),
        experienceAndSkill: [['kitesurfing', 'surfing', 'wing foiling'][i % 3]],
        nationalityCountry: ['PT', 'ES', 'FR', 'IT'][i % 4],
        seasonalExperience: [
          {
            schoolName: `School ${i}`,
            role: 'Instructor',
            startMonth: 5,
            startYear: 2024,
          },
        ],
      })
    );
    const { cards } = selectHomepageFeaturedTalent(inputs, 6);
    expect(cards).toHaveLength(6);
  });

  it('applies soft sport diversity when alternatives exist', () => {
    const sports = [
      'kitesurfing',
      'kitesurfing',
      'kitesurfing',
      'surfing',
      'surfing',
      'wing foiling',
      'wing foiling',
      'scuba-diving',
      'kayaking',
    ];
    const countries = ['PT', 'ES', 'FR', 'IT', 'GR', 'HR', 'AU', 'ZA', 'NL'];
    const inputs: TalentScoreInput[] = sports.map((sport, i) =>
      baseTalent({
        _id: String(i).padStart(24, '0'),
        experienceAndSkill: [sport],
        nationalityCountry: countries[i],
        availability: 'available_now',
        seasonalExperience: [
          {
            schoolName: `School ${i}`,
            role: 'Instructor',
            startMonth: 5,
            startYear: 2024,
          },
        ],
      })
    );

    const { ranked } = rankEligibleTalent(inputs);
    const { selected, diversityRelaxed } = selectWithDiversity(ranked, 6);
    const kiteCount = selected.filter((s) => s.primarySport === 'kitesurfing')
      .length;
    expect(diversityRelaxed).toBe(false);
    expect(kiteCount).toBeLessThanOrEqual(2);
    expect(selected).toHaveLength(6);
  });

  it('relaxes diversity rather than returning fewer than six', () => {
    const inputs = Array.from({ length: 6 }, (_, i) =>
      baseTalent({
        _id: String(i).padStart(24, 'a'),
        experienceAndSkill: ['kitesurfing'],
        nationalityCountry: 'PT',
        seasonalExperience: [
          {
            schoolName: 'Same School',
            role: 'Instructor',
            startMonth: 5,
            startYear: 2024,
          },
        ],
      })
    );
    const { cards, debug } = selectHomepageFeaturedTalent(inputs, 6);
    expect(cards).toHaveLength(6);
    expect(debug.diversityRelaxed).toBe(true);
  });

  it('uses stable tie-breakers for identical scores', () => {
    const now = new Date('2026-11-14').getTime();
    const older = baseTalent({
      _id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
      professionalProfileUpdatedAt: new Date('2026-10-01'),
    });
    const newer = baseTalent({
      _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      professionalProfileUpdatedAt: new Date('2026-11-01'),
    });
    // Same availability/completeness → newer professional update ranks first
    const { ranked } = rankEligibleTalent([older, newer], now);
    expect(ranked[0].id).toBe(newer._id);

    const sameStampA = baseTalent({
      _id: 'cccccccccccccccccccccccc',
      professionalProfileUpdatedAt: new Date('2026-11-01'),
    });
    const sameStampB = baseTalent({
      _id: 'dddddddddddddddddddddddd',
      professionalProfileUpdatedAt: new Date('2026-11-01'),
    });
    const { ranked: tied } = rankEligibleTalent([sameStampB, sameStampA], now);
    expect(tied[0].id < tied[1].id).toBe(true);
  });

  it('excludes no-image and unpublished from selection', () => {
    const inputs = [
      baseTalent({ _id: '1'.padStart(24, '0') }),
      baseTalent({ _id: '2'.padStart(24, '0'), pictures: [] }),
      baseTalent({ _id: '3'.padStart(24, '0'), published: false }),
    ];
    const { cards, debug } = selectHomepageFeaturedTalent(inputs, 6);
    expect(cards).toHaveLength(1);
    expect(debug.rejectedReasonCounts.no_image).toBe(1);
    expect(debug.rejectedReasonCounts.unpublished).toBe(1);
  });
});

describe('clearHomepageFeaturedTalentCache', () => {
  it('clears the module cache without throwing', () => {
    clearHomepageFeaturedTalentCache();
    clearHomepageFeaturedTalentCache();
  });
});
