// The module under test pulls in Blob upload, Mongo and the OG image renderer at import time.
// None of that is needed for the pure caption/hashtag helpers.
jest.mock('@vercel/blob', () => ({ put: jest.fn() }));
jest.mock('@/lib/db', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/models/Job', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/instagram-image', () => ({
  generateInstagramImageBuffer: jest.fn(),
}));

import {
  buildInstagramAltText,
  buildInstagramHashtags,
  buildInstagramPreview,
  buildJobCaption,
  instagramHandleFromUrl,
  resolveCompanyInstagramHandle,
} from '@/lib/social/instagram';

const kiteJob = {
  title: 'Kitesurf Instructor',
  city: 'Tarifa',
  country: 'ES',
  type: 'Full-time',
  sports: ['kitesurfing'],
  occupationalAreas: ['instructor'],
  pictures: ['https://cdn.example.com/beach.jpg'],
  description: '<p>Join our team for the summer season on the Atlantic side.</p>',
  company: {
    name: 'Kite House',
    socialMedia: { instagram: 'https://www.instagram.com/kitehousetarifa/' },
  },
};

describe('instagramHandleFromUrl', () => {
  it('extracts the handle from profile URLs', () => {
    expect(instagramHandleFromUrl('https://www.instagram.com/kitehousetarifa/')).toBe(
      'kitehousetarifa'
    );
    expect(instagramHandleFromUrl('http://instagram.com/kite.house_1?hl=en')).toBe(
      'kite.house_1'
    );
    expect(instagramHandleFromUrl('instagram.com/KiteHouse')).toBe('kitehouse');
  });

  it('accepts bare handles with or without @', () => {
    expect(instagramHandleFromUrl('@kitehouse')).toBe('kitehouse');
    expect(instagramHandleFromUrl('kitehouse')).toBe('kitehouse');
  });

  it('rejects post URLs, other hosts, and malformed values', () => {
    expect(instagramHandleFromUrl('https://www.instagram.com/p/Cabc123/')).toBeNull();
    expect(instagramHandleFromUrl('https://www.instagram.com/reel/Cabc123/')).toBeNull();
    expect(instagramHandleFromUrl('https://facebook.com/kitehouse')).toBeNull();
    expect(instagramHandleFromUrl('https://www.instagram.com/')).toBeNull();
    expect(instagramHandleFromUrl('not a url at all')).toBeNull();
    expect(instagramHandleFromUrl('')).toBeNull();
    expect(instagramHandleFromUrl(undefined)).toBeNull();
  });
});

describe('resolveCompanyInstagramHandle', () => {
  it('reads the handle from the company socialMedia field', () => {
    expect(resolveCompanyInstagramHandle(kiteJob)).toBe('kitehousetarifa');
  });

  it('returns null when the company has no Instagram profile', () => {
    expect(resolveCompanyInstagramHandle({ company: { name: 'No Socials' } })).toBeNull();
    expect(resolveCompanyInstagramHandle({})).toBeNull();
  });
});

describe('buildInstagramHashtags', () => {
  it('produces activity-specific tags and a city/activity combination', () => {
    const tags = buildInstagramHashtags(kiteJob);

    expect(tags).toEqual(
      expect.arrayContaining([
        '#kitesurfjobs',
        '#kitesurfinstructor',
        '#tarifakitesurf',
        '#tarifa',
        '#instructorjobs',
      ])
    );
  });

  it('expands the ISO country code into a country tag', () => {
    expect(buildInstagramHashtags(kiteJob)).toContain('#spainjobs');
  });

  it('drops generic recruiting tags and employment-type noise', () => {
    const tags = buildInstagramHashtags(kiteJob);

    expect(tags).not.toContain('#hiring');
    expect(tags).not.toContain('#sportsjobs');
    expect(tags).not.toContain('#fulltime');
  });

  it('always ends with the anchor tag and never exceeds the cap', () => {
    const tags = buildInstagramHashtags({
      ...kiteJob,
      sports: ['kitesurfing', 'windsurfing', 'surfing', 'sailing'],
    });

    expect(tags).toHaveLength(10);
    expect(tags[tags.length - 1]).toBe('#watersportsjobs');
    expect(new Set(tags).size).toBe(tags.length);
  });

  it('handles jobs with no sport, city, or country', () => {
    expect(buildInstagramHashtags({ title: 'Something' })).toEqual(['#watersportsjobs']);
  });
});

describe('buildJobCaption', () => {
  it('leads with role and location using the full country name', () => {
    const { caption } = buildJobCaption(kiteJob, { companyHandle: 'kitehousetarifa' });

    expect(caption.split('\n')[0]).toBe('Kitesurf Instructor wanted in Tarifa, Spain');
  });

  it('mentions the company handle and prompts for tags', () => {
    const { caption } = buildJobCaption(kiteJob, { companyHandle: 'kitehousetarifa' });

    expect(caption).toContain('Kite House (@kitehousetarifa)');
    expect(caption).toContain('Tag them below.');
    expect(caption).toContain('chickenloop.com (link in bio)');
  });

  it('omits the handle when none is known', () => {
    const { caption } = buildJobCaption(kiteJob);

    expect(caption).toContain('🏢 Kite House');
    expect(caption).not.toContain('@');
  });

  it('keeps the full caption within the caption budget', () => {
    const { fullCaption } = buildJobCaption(
      { ...kiteJob, description: '<p>' + 'word '.repeat(2000) + '</p>' },
      { companyHandle: 'kitehousetarifa' }
    );

    expect(fullCaption.length).toBeLessThanOrEqual(1000);
  });
});

describe('buildInstagramPreview', () => {
  it('resolves the collaborator from the company profile', () => {
    const preview = buildInstagramPreview(kiteJob);

    expect(preview.collaborator).toBe('kitehousetarifa');
    expect(preview.imageUrl).toBe('https://cdn.example.com/beach.jpg');
    expect(preview.fullCaption).toContain('#watersportsjobs');
  });

  it('lets an explicit collaborator override the company profile', () => {
    const preview = buildInstagramPreview(kiteJob, { collaborator: '@otherschool' });

    expect(preview.collaborator).toBe('otherschool');
    expect(preview.caption).toContain('@otherschool');
  });
});

describe('buildInstagramAltText', () => {
  it('describes the role, company and location', () => {
    expect(buildInstagramAltText(kiteJob)).toBe(
      'Kitesurf Instructor at Kite House in Tarifa, Spain. Watersports job vacancy listed on Chickenloop.'
    );
  });
});
