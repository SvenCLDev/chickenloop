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
