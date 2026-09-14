import {
  buildJobPathSlug,
  generateJobUrlPath,
  getJobUrl,
  jobIdSlugSuffix,
  parseJobSlug,
  pickOldestJobMatch,
} from '@/lib/jobSlug';

const OLD_ID = 'aaaaaaaaaaaaaaaa00000001';
const NEW_ID = 'bbbbbbbbbbbbbbbb00000002';

describe('jobIdSlugSuffix', () => {
  it('returns the last 8 hex characters of an ObjectId', () => {
    expect(jobIdSlugSuffix('6aa81fba0c59ccb2c03ca93c')).toBe('c03ca93c');
    expect(jobIdSlugSuffix(OLD_ID)).toBe('00000001');
  });
});

describe('parseJobSlug', () => {
  it('splits a unique slug into base + id suffix', () => {
    expect(parseJobSlug('surf-instructor-fuerteventura-c03ca93c')).toEqual({
      baseSlug: 'surf-instructor-fuerteventura',
      idSuffix: 'c03ca93c',
    });
  });

  it('treats legacy title-only slugs as having no suffix', () => {
    expect(parseJobSlug('surf-instructor-fuerteventura')).toEqual({
      baseSlug: 'surf-instructor-fuerteventura',
      idSuffix: null,
    });
  });

  it('round-trips with buildJobPathSlug', () => {
    const pathSlug = buildJobPathSlug('Surf Instructor Fuerteventura', NEW_ID);
    expect(pathSlug).toBe('surf-instructor-fuerteventura-00000002');
    expect(parseJobSlug(pathSlug)).toEqual({
      baseSlug: 'surf-instructor-fuerteventura',
      idSuffix: '00000002',
    });
  });
});

describe('generateJobUrlPath / getJobUrl', () => {
  it('includes country and id suffix', () => {
    expect(
      generateJobUrlPath('Surf Instructor Fuerteventura', 'ES', NEW_ID)
    ).toBe('/job/spain/surf-instructor-fuerteventura-00000002');

    expect(
      getJobUrl({
        _id: NEW_ID,
        title: 'Surf Instructor Fuerteventura',
        country: 'ES',
      })
    ).toBe('/job/spain/surf-instructor-fuerteventura-00000002');
  });

  it('produces different URLs for same title different ids', () => {
    const a = getJobUrl({
      _id: OLD_ID,
      title: 'Surf Instructor Fuerteventura',
      country: 'ES',
    });
    const b = getJobUrl({
      _id: NEW_ID,
      title: 'Surf Instructor Fuerteventura',
      country: 'ES',
    });
    expect(a).not.toBe(b);
    expect(a).toContain('00000001');
    expect(b).toContain('00000002');
  });

  it('throws when job id is missing', () => {
    expect(() =>
      getJobUrl({ title: 'Surf Instructor Fuerteventura', country: 'ES' })
    ).toThrow(/Job id is required/);
  });
});

describe('pickOldestJobMatch', () => {
  it('returns the oldest match for colliding title-only redirects', () => {
    const oldest = pickOldestJobMatch([
      {
        _id: NEW_ID,
        createdAt: '2026-09-12T00:00:00.000Z',
      },
      {
        _id: OLD_ID,
        createdAt: '2026-03-01T00:00:00.000Z',
      },
    ]);

    expect(oldest?._id).toBe(OLD_ID);
  });

  it('returns null for an empty list', () => {
    expect(pickOldestJobMatch([])).toBeNull();
  });
});
