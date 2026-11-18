import {
  shouldPlaceTalentNetworkPromo,
  shouldShowTalentNetworkPromo,
} from '@/lib/talentNetworkPromoVisibility';

describe('shouldShowTalentNetworkPromo', () => {
  it('hides while auth is loading', () => {
    expect(shouldShowTalentNetworkPromo({ authLoading: true })).toBe(false);
  });

  it('shows for anonymous visitors', () => {
    expect(shouldShowTalentNetworkPromo({ role: null, authLoading: false })).toBe(
      true
    );
  });

  it('hides for recruiters and admins', () => {
    expect(
      shouldShowTalentNetworkPromo({ role: 'recruiter', authLoading: false })
    ).toBe(false);
    expect(
      shouldShowTalentNetworkPromo({ role: 'admin', authLoading: false })
    ).toBe(false);
  });

  it('hides for job seekers until cvCount is known', () => {
    expect(
      shouldShowTalentNetworkPromo({
        role: 'job-seeker',
        authLoading: false,
        cvCount: null,
      })
    ).toBe(false);
  });

  it('shows for job seekers with no profile', () => {
    expect(
      shouldShowTalentNetworkPromo({
        role: 'job-seeker',
        authLoading: false,
        cvCount: 0,
      })
    ).toBe(true);
  });

  it('hides for job seekers who already have a profile', () => {
    expect(
      shouldShowTalentNetworkPromo({
        role: 'job-seeker',
        authLoading: false,
        cvCount: 1,
      })
    ).toBe(false);
  });
});

describe('shouldPlaceTalentNetworkPromo', () => {
  it('requires page 1, at least six jobs, and an eligible viewer', () => {
    expect(
      shouldPlaceTalentNetworkPromo({
        initialPage: 1,
        jobCount: 6,
        viewerEligible: true,
      })
    ).toBe(true);
    expect(
      shouldPlaceTalentNetworkPromo({
        initialPage: 2,
        jobCount: 20,
        viewerEligible: true,
      })
    ).toBe(false);
    expect(
      shouldPlaceTalentNetworkPromo({
        initialPage: 1,
        jobCount: 5,
        viewerEligible: true,
      })
    ).toBe(false);
    expect(
      shouldPlaceTalentNetworkPromo({
        initialPage: 1,
        jobCount: 20,
        viewerEligible: false,
      })
    ).toBe(false);
  });
});
