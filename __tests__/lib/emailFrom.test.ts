describe('formatFromAddress', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.RESEND_FROM_NAME;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns bare email when no display name is provided', async () => {
    const { formatFromAddress } = await import('@/lib/email');
    expect(formatFromAddress('noreply@notifications.chickenloop.com')).toBe(
      'noreply@notifications.chickenloop.com'
    );
  });

  it('formats with explicit display name', async () => {
    const { formatFromAddress } = await import('@/lib/email');
    expect(
      formatFromAddress('noreply@notifications.chickenloop.com', 'Chickenloop References')
    ).toBe('"Chickenloop References" <noreply@notifications.chickenloop.com>');
  });

  it('uses RESEND_FROM_NAME when display name argument is omitted', async () => {
    process.env.RESEND_FROM_NAME = 'Chickenloop';
    const { formatFromAddress } = await import('@/lib/email');
    expect(formatFromAddress('noreply@notifications.chickenloop.com')).toBe(
      '"Chickenloop" <noreply@notifications.chickenloop.com>'
    );
  });

  it('does not double-format an already formatted address', async () => {
    const { formatFromAddress } = await import('@/lib/email');
    const formatted = '"Chickenloop" <noreply@notifications.chickenloop.com>';
    expect(formatFromAddress(formatted, 'Ignored')).toBe(formatted);
  });
});
