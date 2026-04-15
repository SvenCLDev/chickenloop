import {
  mapAiEmploymentToFormType,
  sanitizeParsedCity,
  sanitizeParsedCountryEnglish,
  sanitizeParsedSalary,
  sanitizeParsedJobOutput,
} from '@/lib/ai/sanitizeParsedJob';

describe('mapAiEmploymentToFormType', () => {
  it('maps seasonal to part-time for the job form', () => {
    expect(mapAiEmploymentToFormType('seasonal')).toBe('part-time');
  });

  it('accepts hyphenated values', () => {
    expect(mapAiEmploymentToFormType('full-time')).toBe('full-time');
    expect(mapAiEmploymentToFormType('part_time')).toBe('part-time');
  });

  it('returns null for invalid values', () => {
    expect(mapAiEmploymentToFormType('freelance')).toBeNull();
    expect(mapAiEmploymentToFormType(null)).toBeNull();
  });
});

describe('sanitizeParsedJobOutput', () => {
  it('filters unknown enum strings and maps experience tiers', () => {
    const out = sanitizeParsedJobOutput({
      employmentType: 'contract',
      experienceLevel: 'intermediate',
      languages: ['English', 'Klingon'],
      sports: ['kitesurfing', 'not a sport'],
      qualifications: ['VDWS Kitesurf Instructor Level 2', 'Fake cert'],
      occupationalAreas: ['instructor', 'sales'],
    });
    expect(out.employmentType).toBe('contract');
    expect(out.experienceLevel).toEqual(['senior']);
    expect(out.languages).toEqual(['English']);
    expect(out.sports).toEqual(['kitesurfing']);
    expect(out.qualifications).toEqual(['VDWS Kitesurf Instructor Level 2']);
    expect(out.occupationalAreas).toEqual(['instructor']);
    expect(out.salary).toBeNull();
    expect(out.city).toBeNull();
    expect(out.country).toBeNull();
  });

  it('normalizes country to canonical English and keeps city', () => {
    const out = sanitizeParsedJobOutput({
      employmentType: null,
      experienceLevel: null,
      languages: [],
      sports: [],
      qualifications: [],
      occupationalAreas: [],
      salary: '$2,500 / month',
      city: '  Tarifa  ',
      country: 'Spain',
    });
    expect(out.salary).toBe('$2,500 / month');
    expect(out.city).toBe('Tarifa');
    expect(out.country).toBe('Spain');
  });

  it('rejects unknown country strings', () => {
    expect(sanitizeParsedCountryEnglish('Freedonia')).toBeNull();
  });
});

describe('sanitizeParsedCity', () => {
  it('trims and collapses whitespace', () => {
    expect(sanitizeParsedCity('  A  B  ')).toBe('A B');
  });

  it('returns null for empty', () => {
    expect(sanitizeParsedCity('   ')).toBeNull();
    expect(sanitizeParsedCity(null)).toBeNull();
  });
});

describe('sanitizeParsedSalary', () => {
  it('keeps salary with numeric info', () => {
    expect(sanitizeParsedSalary(' $50,000 - $70,000 ')).toBe('$50,000 - $70,000');
  });

  it('returns null for vague non-numeric salary', () => {
    expect(sanitizeParsedSalary('competitive')).toBeNull();
    expect(sanitizeParsedSalary('depends on experience')).toBeNull();
  });
});
