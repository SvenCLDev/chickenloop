/**
 * Email rate limiting to prevent accidental spam
 * Soft limits: Log violations but don't block emails (safety net)
 */

import { EmailCategory } from './email';

/**
 * Rate limit configuration
 * All limits are per-user, per time window
 */
export const RATE_LIMITS = {
  // Maximum emails per user per hour (all categories combined)
  MAX_EMAILS_PER_HOUR: 20,
  
  // Maximum emails per user per day (all categories combined)
  MAX_EMAILS_PER_DAY: 100,
  
  // Maximum status change emails per user per hour
  MAX_STATUS_EMAILS_PER_HOUR: 5,
  
  // Maximum job alerts per user per day
  MAX_JOB_ALERTS_PER_DAY: 3,
  
  // Maximum job alerts per user per hour
  MAX_JOB_ALERTS_PER_HOUR: 1,
} as const;

/**
 * In-memory tracking of email counts per user
 * In production, consider using Redis for distributed systems
 */
interface UserEmailCounts {
  hourly: Map<string, number>; // userId -> count in last hour
  daily: Map<string, number>; // userId -> count in last 24 hours
  statusHourly: Map<string, number>; // userId -> status email count in last hour
  jobAlertsDaily: Map<string, number>; // userId -> job alert count in last 24 hours
  jobAlertsHourly: Map<string, number>; // userId -> job alert count in last hour
  lastReset: Date; // Last time counters were reset
}

// Global tracking state
let emailCounts: UserEmailCounts = {
  hourly: new Map(),
  daily: new Map(),
  statusHourly: new Map(),
  jobAlertsDaily: new Map(),
  jobAlertsHourly: new Map(),
  lastReset: new Date(),
};

/**
 * Reset counters periodically (every hour)
 */
function resetCountersIfNeeded() {
  const now = new Date();
  const hoursSinceReset = (now.getTime() - emailCounts.lastReset.getTime()) / (1000 * 60 * 60);
  
  if (hoursSinceReset >= 1) {
    // Reset hourly counters
    emailCounts.hourly.clear();
    emailCounts.statusHourly.clear();
    emailCounts.jobAlertsHourly.clear();
    
    // Reset daily counters if 24 hours have passed
    if (hoursSinceReset >= 24) {
      emailCounts.daily.clear();
      emailCounts.jobAlertsDaily.clear();
    }
    
    emailCounts.lastReset = now;
  }
}

/**
 * Check if email should be rate limited (soft limit - logs but doesn't block)
 * @param userId - User ID
 * @param category - Email category
 * @param eventType - Event type
 * @returns Object with shouldAllow flag and reason if limited
 */
export function checkEmailRateLimit(
  userId: string | undefined,
  category: EmailCategory,
  eventType: string
): { shouldAllow: boolean; reason?: string; counts?: Record<string, number> } {
  // Reset counters if needed
  resetCountersIfNeeded();
  
  // Anonymous users: allow but log
  if (!userId) {
    return { shouldAllow: true };
  }
  
  // Get current counts
  const hourlyCount = emailCounts.hourly.get(userId) || 0;
  const dailyCount = emailCounts.daily.get(userId) || 0;
  
  // Check overall limits
  if (hourlyCount >= RATE_LIMITS.MAX_EMAILS_PER_HOUR) {
    return {
      shouldAllow: true, // Soft limit - allow but log
      reason: `Hourly limit exceeded: ${hourlyCount}/${RATE_LIMITS.MAX_EMAILS_PER_HOUR} emails`,
      counts: { hourly: hourlyCount, daily: dailyCount },
    };
  }
  
  if (dailyCount >= RATE_LIMITS.MAX_EMAILS_PER_DAY) {
    return {
      shouldAllow: true, // Soft limit - allow but log
      reason: `Daily limit exceeded: ${dailyCount}/${RATE_LIMITS.MAX_EMAILS_PER_DAY} emails`,
      counts: { hourly: hourlyCount, daily: dailyCount },
    };
  }
  
  // Check category-specific limits
  if (category === EmailCategory.IMPORTANT_TRANSACTIONAL && eventType === 'status_changed') {
    const statusCount = emailCounts.statusHourly.get(userId) || 0;
    if (statusCount >= RATE_LIMITS.MAX_STATUS_EMAILS_PER_HOUR) {
      return {
        shouldAllow: true, // Soft limit - allow but log
        reason: `Status email hourly limit exceeded: ${statusCount}/${RATE_LIMITS.MAX_STATUS_EMAILS_PER_HOUR}`,
        counts: { hourly: hourlyCount, daily: dailyCount, statusHourly: statusCount },
      };
    }
  }
  
  if (category === EmailCategory.USER_NOTIFICATION && eventType === 'job_alert') {
    const jobAlertsHourly = emailCounts.jobAlertsHourly.get(userId) || 0;
    const jobAlertsDaily = emailCounts.jobAlertsDaily.get(userId) || 0;
    
    if (jobAlertsHourly >= RATE_LIMITS.MAX_JOB_ALERTS_PER_HOUR) {
      return {
        shouldAllow: true, // Soft limit - allow but log
        reason: `Job alert hourly limit exceeded: ${jobAlertsHourly}/${RATE_LIMITS.MAX_JOB_ALERTS_PER_HOUR}`,
        counts: { hourly: hourlyCount, daily: dailyCount, jobAlertsHourly, jobAlertsDaily },
      };
    }
    
    if (jobAlertsDaily >= RATE_LIMITS.MAX_JOB_ALERTS_PER_DAY) {
      return {
        shouldAllow: true, // Soft limit - allow but log
        reason: `Job alert daily limit exceeded: ${jobAlertsDaily}/${RATE_LIMITS.MAX_JOB_ALERTS_PER_DAY}`,
        counts: { hourly: hourlyCount, daily: dailyCount, jobAlertsHourly, jobAlertsDaily },
      };
    }
  }
  
  return { shouldAllow: true };
}

/**
 * Record that an email was sent (increment counters)
 * @param userId - User ID
 * @param category - Email category
 * @param eventType - Event type
 */
export function recordEmailSent(
  userId: string | undefined,
  category: EmailCategory,
  eventType: string
): void {
  if (!userId) {
    return; // Don't track anonymous users
  }
  
  // Reset counters if needed
  resetCountersIfNeeded();
  
  // Increment overall counters
  emailCounts.hourly.set(userId, (emailCounts.hourly.get(userId) || 0) + 1);
  emailCounts.daily.set(userId, (emailCounts.daily.get(userId) || 0) + 1);
  
  // Increment category-specific counters
  if (category === EmailCategory.IMPORTANT_TRANSACTIONAL && eventType === 'status_changed') {
    emailCounts.statusHourly.set(userId, (emailCounts.statusHourly.get(userId) || 0) + 1);
  }
  
  if (category === EmailCategory.USER_NOTIFICATION && eventType === 'job_alert') {
    emailCounts.jobAlertsHourly.set(userId, (emailCounts.jobAlertsHourly.get(userId) || 0) + 1);
    emailCounts.jobAlertsDaily.set(userId, (emailCounts.jobAlertsDaily.get(userId) || 0) + 1);
  }
}

/**
 * Get current email counts for a user (for debugging)
 */
export function getUserEmailCounts(userId: string): {
  hourly: number;
  daily: number;
  statusHourly: number;
  jobAlertsHourly: number;
  jobAlertsDaily: number;
} {
  resetCountersIfNeeded();
  
  return {
    hourly: emailCounts.hourly.get(userId) || 0,
    daily: emailCounts.daily.get(userId) || 0,
    statusHourly: emailCounts.statusHourly.get(userId) || 0,
    jobAlertsHourly: emailCounts.jobAlertsHourly.get(userId) || 0,
    jobAlertsDaily: emailCounts.jobAlertsDaily.get(userId) || 0,
  };
}
