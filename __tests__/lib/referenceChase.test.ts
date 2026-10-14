import {
  buildReferenceChaseSnippet,
  isSelfAsReferenceEmail,
} from '@/lib/talentNetwork/referenceChase';

describe('referenceChase', () => {
  it('builds a token-free chase snippet', () => {
    const text = buildReferenceChaseSnippet({
      schoolName: 'Aquasail',
      seasonLabel: 'Summer 2024',
      managerName: 'Sam',
    });
    expect(text).toContain('Hi Sam,');
    expect(text).toContain('Aquasail');
    expect(text).toContain('Summer 2024');
    expect(text).not.toMatch(/reference\/confirm/i);
    expect(text).not.toMatch(/https?:\/\//i);
  });

  it('detects self-as-manager email case-insensitively', () => {
    expect(
      isSelfAsReferenceEmail('Me@Example.com', ['other@x.com', 'me@example.com'])
    ).toBe(true);
    expect(isSelfAsReferenceEmail('boss@school.com', ['me@example.com'])).toBe(
      false
    );
  });
});
