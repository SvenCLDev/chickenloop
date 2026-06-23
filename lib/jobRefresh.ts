export const JOB_REFRESH_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export function getJobRefreshCooldownRemainingMs(
  lastRefreshedAt: Date | string | null | undefined,
  now: Date = new Date()
): number {
  if (!lastRefreshedAt) return 0;

  const last = new Date(lastRefreshedAt);
  if (Number.isNaN(last.getTime())) return 0;

  const eligibleAt = last.getTime() + JOB_REFRESH_COOLDOWN_MS;
  return Math.max(0, eligibleAt - now.getTime());
}

export function getJobRefreshDaysRemaining(
  lastRefreshedAt: Date | string | null | undefined,
  now: Date = new Date()
): number {
  const remainingMs = getJobRefreshCooldownRemainingMs(lastRefreshedAt, now);
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
}

export function canRefreshJob(
  lastRefreshedAt: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  return getJobRefreshCooldownRemainingMs(lastRefreshedAt, now) === 0;
}

export function getJobRefreshCooldownMessage(daysRemaining: number): string {
  const daysLabel = daysRemaining === 1 ? '1 day' : `${daysRemaining} days`;
  return `Jobs can only be refreshed 1x per week. You can refresh this job in ${daysLabel}. If you need more exposure please consider featuring your job. Featured jobs get more than double the amount of views.`;
}
