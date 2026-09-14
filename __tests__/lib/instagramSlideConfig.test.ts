import {
  buildDefaultCarouselConfig,
  defaultImageModeForSlide,
  normalizeCarouselSlides,
} from '@/lib/instagramSlideConfig';

const twoPicJob = {
  title: 'Kitesurf Instructor',
  city: 'Tarifa',
  country: 'ES',
  type: 'Full-time',
  experienceLevel: '2+ years',
  qualifications: ['IKO'],
  description: '<p>Join our team for the summer season on the Atlantic side of Tarifa.</p>',
  pictures: ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg'],
};

const onePicJob = {
  title: 'Surf Coach',
  city: 'Hossegor',
  country: 'FR',
  description: '<p>Teach beginners.</p>',
  pictures: ['https://cdn.example.com/only.jpg'],
};

describe('defaultImageModeForSlide', () => {
  it('uses photo0 / photo1 / photo0 for a two-picture job', () => {
    expect(defaultImageModeForSlide(0, twoPicJob)).toBe('picture0');
    expect(defaultImageModeForSlide(1, twoPicJob)).toBe('picture1');
    expect(defaultImageModeForSlide(2, twoPicJob)).toBe('picture0');
  });

  it('blurs photo0 on slide 2 when only one picture exists', () => {
    expect(defaultImageModeForSlide(0, onePicJob)).toBe('picture0');
    expect(defaultImageModeForSlide(1, onePicJob)).toBe('picture0_blur');
    expect(defaultImageModeForSlide(2, onePicJob)).toBe('picture0');
  });

  it('falls back to gradient when there are no pictures', () => {
    expect(defaultImageModeForSlide(0, { pictures: [] })).toBe('gradient');
    expect(defaultImageModeForSlide(1, {})).toBe('gradient');
  });
});

describe('buildDefaultCarouselConfig', () => {
  it('returns three slides with hook / details / CTA defaults', () => {
    const slides = buildDefaultCarouselConfig(twoPicJob);

    expect(slides).toHaveLength(3);
    expect(slides[0].headline).toBe('Wanted');
    expect(slides[0].titleOverride).toBe('Kitesurf Instructor');
    expect(slides[0].locationOverride).toContain('Tarifa');
    expect(slides[0].imageMode).toBe('picture0');

    expect(slides[1].layout).toBe('split');
    expect(slides[1].imageMode).toBe('picture1');
    expect(slides[1].bodyText).toContain('Join our team');
    expect(slides[1].showType).toBe(true);
    expect(slides[1].showExperience).toBe(true);
    expect(slides[1].showQualifications).toBe(true);

    expect(slides[2].ctas).toEqual(
      expect.arrayContaining([
        'link_in_bio',
        'create_profile',
        'job_alert',
        'share_friend',
      ])
    );
  });

  it('uses blurred photo for details when only one picture exists', () => {
    const slides = buildDefaultCarouselConfig(onePicJob);
    expect(slides[1].imageMode).toBe('picture0_blur');
  });
});

describe('normalizeCarouselSlides', () => {
  it('falls back to defaults when fewer than 2 slides are provided', () => {
    const slides = normalizeCarouselSlides([{ layout: 'overlay' }], twoPicJob);
    expect(slides).toHaveLength(3);
    expect(slides[0].headline).toBe('Wanted');
  });

  it('sanitizes and keeps a valid custom slide set', () => {
    const slides = normalizeCarouselSlides(
      [
        {
          layout: 'overlay',
          imageMode: 'picture0',
          headline: 'Hiring',
          titleOverride: 'Custom Title',
        },
        {
          layout: 'split',
          imageMode: 'picture0_blur',
          bodyText: 'Short body',
          showType: false,
        },
        {
          layout: 'overlay',
          imageMode: 'gradient',
          ctas: ['link_in_bio', 'not_a_real_cta'],
        },
      ],
      twoPicJob
    );

    expect(slides).toHaveLength(3);
    expect(slides[0].headline).toBe('Hiring');
    expect(slides[0].titleOverride).toBe('Custom Title');
    expect(slides[1].bodyText).toBe('Short body');
    expect(slides[1].showType).toBe(false);
    expect(slides[2].ctas).toEqual(['link_in_bio']);
  });
});
