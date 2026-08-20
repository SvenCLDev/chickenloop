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
    const { subject, html, text } = referenceVerificationEmail({
      candidateName: 'Sven Kelling',
      schoolName: 'Aquasail India',
      seasonLabel: 'summer 2013',
      confirmWorkedRehireUrl: 'https://example.com/worked-rehire',
      confirmWorkedNoRehireUrl: 'https://example.com/worked-no-rehire',
      confirmNotWorkedUrl: 'https://example.com/not-worked',
      confirmPageUrl: 'https://example.com/form',
    });

    expect(subject).toBe('Aquasail India: reference request for Sven Kelling');
    expect(html).toContain('one-click confirm takes 10 seconds');
    expect(html).toContain('Hello from Chickenloop');
    expect(html).toContain('About Chickenloop');
    expect(html).toContain('Yes, they worked here — I would rehire them');
    expect(html).toContain('Yes, they worked here — I would not rehire them');
    expect(html).toContain('No, they did not work at our center');
    expect(html).toContain('https://www.chickenloop.com/register');
    expect(html).toContain('https://www.chickenloop.com/candidates');
    expect(html).toContain('https://www.chickenloop.com/jobs');
    expect(text).toContain('About Chickenloop');
    expect(text).toContain('Post a job: https://www.chickenloop.com/register');
    expect(text).toContain('This link expires in 14 days.');
    expect(text).toContain('Open reference form: https://example.com/form');
  });

  it('personalizes greeting when manager name is provided', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.chickenloop.com';
    jest.resetModules();
    const { referenceVerificationEmail } = await import(
      '@/lib/email/templates/referenceVerification'
    );
    const { html, text } = referenceVerificationEmail({
      candidateName: 'Sven Kelling',
      schoolName: 'Aquasail India',
      managerName: 'Maria',
      confirmWorkedRehireUrl: 'https://example.com/worked-rehire',
      confirmWorkedNoRehireUrl: 'https://example.com/worked-no-rehire',
      confirmNotWorkedUrl: 'https://example.com/not-worked',
    });

    expect(html).toContain('Hi Maria,');
    expect(text).toContain('Hi Maria,');
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

  it('builds confirm URLs with worked and rehire query params', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_URL = 'preview.example.vercel.app';
    const { buildReferenceConfirmUrl } = await import('@/lib/referenceVerificationToken');
    expect(buildReferenceConfirmUrl('abc123', 'worked-rehire')).toBe(
      'https://preview.example.vercel.app/reference/confirm/abc123?worked=yes&rehire=yes'
    );
    expect(buildReferenceConfirmUrl('abc123', 'worked-no-rehire')).toBe(
      'https://preview.example.vercel.app/reference/confirm/abc123?worked=yes&rehire=no'
    );
    expect(buildReferenceConfirmUrl('abc123', 'not-worked')).toBe(
      'https://preview.example.vercel.app/reference/confirm/abc123?worked=no'
    );
  });
});

describe('parseReferenceConfirmParams', () => {
  it('parses three-button URL shapes', async () => {
    const { parseReferenceConfirmParams } = await import('@/lib/referenceVerificationToken');
    expect(parseReferenceConfirmParams({ worked: 'yes', rehire: 'yes' })).toEqual({
      worked: true,
      rehire: true,
    });
    expect(parseReferenceConfirmParams({ worked: 'yes', rehire: 'no' })).toEqual({
      worked: true,
      rehire: false,
    });
    expect(parseReferenceConfirmParams({ worked: 'no', rehire: null })).toEqual({
      worked: false,
    });
  });

  it('maps legacy rehire-only links to worked + rehire', async () => {
    const { parseReferenceConfirmParams } = await import('@/lib/referenceVerificationToken');
    expect(parseReferenceConfirmParams({ worked: null, rehire: 'yes' })).toEqual({
      worked: true,
      rehire: true,
    });
    expect(parseReferenceConfirmParams({ worked: null, rehire: 'no' })).toEqual({
      worked: true,
      rehire: false,
    });
  });
});

describe('parseReferenceConfirmBody', () => {
  it('accepts worked and optional rehire in POST body', async () => {
    const { parseReferenceConfirmBody } = await import('@/lib/referenceVerificationToken');
    expect(parseReferenceConfirmBody({ worked: true, rehire: true })).toEqual({
      worked: true,
      rehire: true,
    });
    expect(parseReferenceConfirmBody({ worked: true, rehire: false })).toEqual({
      worked: true,
      rehire: false,
    });
    expect(parseReferenceConfirmBody({ worked: false })).toEqual({ worked: false });
    expect(parseReferenceConfirmBody({ rehire: 'yes' })).toEqual({
      worked: true,
      rehire: true,
    });
    expect(parseReferenceConfirmBody({ rehire: 'no' })).toEqual({
      worked: true,
      rehire: false,
    });
  });
});
