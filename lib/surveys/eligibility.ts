import type { ISurveyResponse } from '@/models/SurveyResponse';

/**
 * Whether a survey should be offered based on stored response state.
 * "Once per login" session dedupe is handled on the client.
 */
export function shouldOfferSurvey(
  response: Pick<ISurveyResponse, 'dismissed' | 'completedAt' | 'remindLaterUntil'> | null | undefined,
  now: Date = new Date()
): boolean {
  if (!response) return true;
  if (response.dismissed) return false;
  if (response.completedAt) return false;
  if (response.remindLaterUntil) {
    const until = new Date(response.remindLaterUntil);
    if (!Number.isNaN(until.getTime()) && until.getTime() > now.getTime()) {
      return false;
    }
  }
  return true;
}

export function getRemindLaterUntil(from: Date = new Date()): Date {
  const until = new Date(from);
  until.setDate(until.getDate() + 7);
  return until;
}
