/** Delay after publish/content-edit before talent-match email may send. */
export const TALENT_MATCH_EMAIL_DELAY_MS = 2 * 24 * 60 * 60 * 1000;

/** How far past dueAt the cron still processes (missed-day catch window). */
export const TALENT_MATCH_EMAIL_CATCH_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export const TALENT_MATCH_EMAIL_MIN_MATCHES = 2; // matchCount > 1

export function computeTalentMatchEmailDueAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + TALENT_MATCH_EMAIL_DELAY_MS);
}
