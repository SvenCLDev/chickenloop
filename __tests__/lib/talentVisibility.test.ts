import {
  applyTalentDetailVisibility,
  applyTalentListVisibility,
  getAnonymousDisplayName,
  getNameInitials,
  resolveTalentViewerTier,
} from '@/lib/talentVisibility';

describe('talentVisibility', () => {
  it('resolves viewer tiers from auth', () => {
    expect(resolveTalentViewerTier(null)).toBe('anonymous');
    expect(resolveTalentViewerTier({ role: 'job-seeker' })).toBe('community');
    expect(resolveTalentViewerTier({ role: 'recruiter' })).toBe('recruiter');
    expect(resolveTalentViewerTier({ role: 'admin' })).toBe('recruiter');
  });

  it('builds initials and anonymous display names', () => {
    expect(getNameInitials('Jane Doe')).toBe('JD');
    expect(getAnonymousDisplayName('Jane Doe')).toBe('J. D.');
  });

  it('redacts anonymous list rows', () => {
    const row = applyTalentListVisibility(
      {
        _id: '1',
        fullName: 'Jane Doe',
        address: 'Secret Street 1',
        summary: 'Bio',
        pictures: ['https://example.com/a.jpg'],
        nationalityCountry: 'ES',
        jobSeeker: { _id: 'u1', name: 'Jane', email: 'jane@example.com' },
      },
      'anonymous'
    );

    expect(row.fullName).toBe('J. D.');
    expect(row.displayName).toBe('J. D.');
    expect(row.pictures).toEqual([]);
    expect(row.summary).toBeUndefined();
    expect(row.address).toBeUndefined();
    expect(row.regionLabel).toBe('ES');
    expect(row.profileLinkAllowed).toBe(false);
    expect(row.jobSeeker?.email).toBeUndefined();
  });

  it('keeps full name for community but strips contacts', () => {
    const row = applyTalentListVisibility(
      {
        _id: '1',
        fullName: 'Jane Doe',
        address: 'Secret Street 1',
        jobSeeker: { _id: 'u1', name: 'Jane', email: 'jane@example.com' },
      },
      'community'
    );

    expect(row.fullName).toBe('Jane Doe');
    expect(row.address).toBeUndefined();
    expect(row.profileLinkAllowed).toBe(true);
    expect(row.jobSeeker?.email).toBeUndefined();
  });

  it('strips detail contacts for community viewers', () => {
    const detail = applyTalentDetailVisibility(
      {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '123',
        address: 'Somewhere',
        jobSeeker: { _id: 'u1', email: 'jane@example.com' },
      },
      'community'
    );

    expect(detail.email).toBeUndefined();
    expect(detail.phone).toBeUndefined();
    expect(detail.address).toBeUndefined();
    expect((detail.jobSeeker as { email?: string }).email).toBeUndefined();
  });
});
