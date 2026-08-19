describe('getReferenceConfirmBaseUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.REFERENCE_CONFIRM_BASE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_BASE_URL;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses REFERENCE_CONFIRM_BASE_URL when set', async () => {
    process.env.REFERENCE_CONFIRM_BASE_URL = 'https://staging.chickenloop.com/';
    const { getReferenceConfirmBaseUrl } = await import('@/lib/baseUrlForReferenceEmails');
    expect(getReferenceConfirmBaseUrl()).toBe('https://staging.chickenloop.com');
  });

  it('uses preview deployment URL on Vercel preview', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_URL = 'chickenloop-git-feature-abc.vercel.app';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.chickenloop.com';
    const { getReferenceConfirmBaseUrl } = await import('@/lib/baseUrlForReferenceEmails');
    expect(getReferenceConfirmBaseUrl()).toBe(
      'https://chickenloop-git-feature-abc.vercel.app'
    );
  });

  it('uses canonical site URL on production', async () => {
    process.env.VERCEL_ENV = 'production';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.chickenloop.com';
    const { getReferenceConfirmBaseUrl } = await import('@/lib/baseUrlForReferenceEmails');
    expect(getReferenceConfirmBaseUrl()).toBe('https://www.chickenloop.com');
  });

  it('falls back to localhost in development', async () => {
    const { getReferenceConfirmBaseUrl } = await import('@/lib/baseUrlForReferenceEmails');
    expect(getReferenceConfirmBaseUrl()).toBe('http://127.0.0.1:3000');
  });
});

describe('getMarketingSiteUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_BASE_URL;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses production URL on Vercel preview', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_URL = 'chickenloop-git-feature-abc.vercel.app';
    const { getMarketingSiteUrl } = await import('@/lib/baseUrlForReferenceEmails');
    expect(getMarketingSiteUrl()).toBe('https://www.chickenloop.com');
  });

  it('uses NEXT_PUBLIC_SITE_URL when set', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.chickenloop.com';
    const { getMarketingSiteUrl } = await import('@/lib/baseUrlForReferenceEmails');
    expect(getMarketingSiteUrl()).toBe('https://www.chickenloop.com');
  });
});

describe('referenceVerificationEmail', () => {
  it('includes About Chickenloop footer with marketing links', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.chickenloop.com';
    jest.resetModules();
    const { referenceVerificationEmail } = await import(
      '@/lib/email/templates/referenceVerification'
    );
    const { html, text } = referenceVerificationEmail({
      candidateName: 'Sven Kelling',
      schoolName: 'Aquasail India',
      seasonLabel: 'summer 2013',
      confirmYesUrl: 'https://example.com/yes',
      confirmNoUrl: 'https://example.com/no',
    });

    expect(html).toContain('About Chickenloop');
    expect(html).toContain('Yes, I would rehire them');
    expect(html).toContain('https://www.chickenloop.com/register');
    expect(html).toContain('https://www.chickenloop.com/candidates');
    expect(html).toContain('https://www.chickenloop.com/jobs');
    expect(text).toContain('About Chickenloop');
    expect(text).toContain('Post a job: https://www.chickenloop.com/register');
    expect(text).toContain('This link expires in 14 days.');
  });
});

describe('buildReferenceConfirmUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.REFERENCE_CONFIRM_BASE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('builds confirm URLs with rehire query param', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_URL = 'preview.example.vercel.app';
    const { buildReferenceConfirmUrl } = await import('@/lib/referenceVerificationToken');
    expect(buildReferenceConfirmUrl('abc123', true)).toBe(
      'https://preview.example.vercel.app/reference/confirm/abc123?rehire=yes'
    );
    expect(buildReferenceConfirmUrl('abc123', false)).toBe(
      'https://preview.example.vercel.app/reference/confirm/abc123?rehire=no'
    );
  });
});
