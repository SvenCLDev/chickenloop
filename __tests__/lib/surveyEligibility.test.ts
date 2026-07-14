import { getRemindLaterUntil, shouldOfferSurvey } from '@/lib/surveys/eligibility';

describe('survey eligibility', () => {
  const now = new Date('2026-07-14T12:00:00.000Z');

  it('offers survey when no prior response exists', () => {
    expect(shouldOfferSurvey(null, now)).toBe(true);
  });

  it('does not offer when dismissed', () => {
    expect(
      shouldOfferSurvey({ dismissed: true, completedAt: null, remindLaterUntil: null }, now)
    ).toBe(false);
  });

  it('does not offer when completed', () => {
    expect(
      shouldOfferSurvey(
        { dismissed: false, completedAt: new Date('2026-07-01'), remindLaterUntil: null },
        now
      )
    ).toBe(false);
  });

  it('does not offer while remindLaterUntil is in the future', () => {
    expect(
      shouldOfferSurvey(
        {
          dismissed: false,
          completedAt: null,
          remindLaterUntil: new Date('2026-07-20T12:00:00.000Z'),
        },
        now
      )
    ).toBe(false);
  });

  it('offers again after remindLaterUntil has passed', () => {
    expect(
      shouldOfferSurvey(
        {
          dismissed: false,
          completedAt: null,
          remindLaterUntil: new Date('2026-07-10T12:00:00.000Z'),
        },
        now
      )
    ).toBe(true);
  });

  it('sets remind later roughly one week ahead', () => {
    const until = getRemindLaterUntil(now);
    expect(until.toISOString()).toBe('2026-07-21T12:00:00.000Z');
  });
});
