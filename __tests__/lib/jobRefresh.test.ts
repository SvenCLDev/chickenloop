import {
  canRefreshJob,
  getJobRefreshCooldownMessage,
  getJobRefreshDaysRemaining,
  JOB_REFRESH_COOLDOWN_MS,
} from '@/lib/jobRefresh';

describe('jobRefresh', () => {
  const now = new Date('2026-06-05T12:00:00.000Z');

  it('allows refresh when job has never been refreshed', () => {
    expect(canRefreshJob(null, now)).toBe(true);
    expect(getJobRefreshDaysRemaining(undefined, now)).toBe(0);
  });

  it('blocks refresh within the 7-day cooldown', () => {
    const lastRefreshedAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    expect(canRefreshJob(lastRefreshedAt, now)).toBe(false);
    expect(getJobRefreshDaysRemaining(lastRefreshedAt, now)).toBe(5);
  });

  it('allows refresh after the cooldown expires', () => {
    const lastRefreshedAt = new Date(now.getTime() - JOB_REFRESH_COOLDOWN_MS);
    expect(canRefreshJob(lastRefreshedAt, now)).toBe(true);
    expect(getJobRefreshDaysRemaining(lastRefreshedAt, now)).toBe(0);
  });

  it('formats the cooldown message with remaining days', () => {
    expect(getJobRefreshCooldownMessage(1)).toContain('in 1 day');
    expect(getJobRefreshCooldownMessage(3)).toContain('in 3 days');
    expect(getJobRefreshCooldownMessage(3)).toContain('featuring your job');
  });
});
