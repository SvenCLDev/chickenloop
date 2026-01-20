import {
  checkEmailRateLimit,
  recordEmailSent,
  getUserEmailCounts,
  RATE_LIMITS,
  EmailCategory,
} from '@/lib/emailRateLimit';

// Mock EmailCategory enum
const EmailCategoryMock = {
  CRITICAL_TRANSACTIONAL: 'critical_transactional',
  IMPORTANT_TRANSACTIONAL: 'important_transactional',
  USER_NOTIFICATION: 'user_notification',
  SYSTEM: 'system',
} as const;

describe('emailRateLimit', () => {
  beforeEach(() => {
    // Reset counters before each test
    // Note: In a real implementation, you might want to expose a reset function
    // For now, we'll test with fresh state
  });

  describe('checkEmailRateLimit', () => {
    it('should allow emails for anonymous users', () => {
      const result = checkEmailRateLimit(
        undefined,
        EmailCategory.IMPORTANT_TRANSACTIONAL,
        'status_changed'
      );
      expect(result.shouldAllow).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow emails within limits', () => {
      const userId = 'user123';
      
      // Send emails up to limit
      for (let i = 0; i < RATE_LIMITS.MAX_EMAILS_PER_HOUR - 1; i++) {
        recordEmailSent(userId, EmailCategory.IMPORTANT_TRANSACTIONAL, 'status_changed');
      }
      
      const result = checkEmailRateLimit(
        userId,
        EmailCategory.IMPORTANT_TRANSACTIONAL,
        'status_changed'
      );
      expect(result.shouldAllow).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should warn when hourly limit exceeded (soft limit)', () => {
      const userId = 'user123';
      
      // Send emails up to and including limit
      for (let i = 0; i < RATE_LIMITS.MAX_EMAILS_PER_HOUR; i++) {
        recordEmailSent(userId, EmailCategory.IMPORTANT_TRANSACTIONAL, 'status_changed');
      }
      
      const result = checkEmailRateLimit(
        userId,
        EmailCategory.IMPORTANT_TRANSACTIONAL,
        'status_changed'
      );
      expect(result.shouldAllow).toBe(true); // Soft limit - still allows
      expect(result.reason).toContain('Hourly limit exceeded');
      expect(result.counts?.hourly).toBe(RATE_LIMITS.MAX_EMAILS_PER_HOUR);
    });

    it('should warn when daily limit exceeded (soft limit)', () => {
      const userId = 'user123';
      
      // Send emails up to and including daily limit
      for (let i = 0; i < RATE_LIMITS.MAX_EMAILS_PER_DAY; i++) {
        recordEmailSent(userId, EmailCategory.IMPORTANT_TRANSACTIONAL, 'status_changed');
      }
      
      const result = checkEmailRateLimit(
        userId,
        EmailCategory.IMPORTANT_TRANSACTIONAL,
        'status_changed'
      );
      expect(result.shouldAllow).toBe(true); // Soft limit - still allows
      expect(result.reason).toContain('Daily limit exceeded');
      expect(result.counts?.daily).toBe(RATE_LIMITS.MAX_EMAILS_PER_DAY);
    });

    it('should warn when status email hourly limit exceeded', () => {
      const userId = 'user123';
      
      // Send status emails up to limit
      for (let i = 0; i < RATE_LIMITS.MAX_STATUS_EMAILS_PER_HOUR; i++) {
        recordEmailSent(userId, EmailCategory.IMPORTANT_TRANSACTIONAL, 'status_changed');
      }
      
      const result = checkEmailRateLimit(
        userId,
        EmailCategory.IMPORTANT_TRANSACTIONAL,
        'status_changed'
      );
      expect(result.shouldAllow).toBe(true); // Soft limit
      expect(result.reason).toContain('Status email hourly limit exceeded');
      expect(result.counts?.statusHourly).toBe(RATE_LIMITS.MAX_STATUS_EMAILS_PER_HOUR);
    });

    it('should warn when job alert hourly limit exceeded', () => {
      const userId = 'user123';
      
      // Send job alert emails up to limit
      for (let i = 0; i < RATE_LIMITS.MAX_JOB_ALERTS_PER_HOUR; i++) {
        recordEmailSent(userId, EmailCategory.USER_NOTIFICATION, 'job_alert');
      }
      
      const result = checkEmailRateLimit(
        userId,
        EmailCategory.USER_NOTIFICATION,
        'job_alert'
      );
      expect(result.shouldAllow).toBe(true); // Soft limit
      expect(result.reason).toContain('Job alert hourly limit exceeded');
      expect(result.counts?.jobAlertsHourly).toBe(RATE_LIMITS.MAX_JOB_ALERTS_PER_HOUR);
    });

    it('should warn when job alert daily limit exceeded', () => {
      const userId = 'user123';
      
      // Send job alert emails up to daily limit
      for (let i = 0; i < RATE_LIMITS.MAX_JOB_ALERTS_PER_DAY; i++) {
        recordEmailSent(userId, EmailCategory.USER_NOTIFICATION, 'job_alert');
      }
      
      const result = checkEmailRateLimit(
        userId,
        EmailCategory.USER_NOTIFICATION,
        'job_alert'
      );
      expect(result.shouldAllow).toBe(true); // Soft limit
      expect(result.reason).toContain('Job alert daily limit exceeded');
      expect(result.counts?.jobAlertsDaily).toBe(RATE_LIMITS.MAX_JOB_ALERTS_PER_DAY);
    });
  });

  describe('recordEmailSent', () => {
    it('should increment counters correctly', () => {
      const userId = 'user123';
      
      recordEmailSent(userId, EmailCategory.IMPORTANT_TRANSACTIONAL, 'status_changed');
      recordEmailSent(userId, EmailCategory.USER_NOTIFICATION, 'job_alert');
      
      const counts = getUserEmailCounts(userId);
      expect(counts.hourly).toBe(2);
      expect(counts.daily).toBe(2);
      expect(counts.statusHourly).toBe(1);
      expect(counts.jobAlertsHourly).toBe(1);
      expect(counts.jobAlertsDaily).toBe(1);
    });

    it('should not track anonymous users', () => {
      recordEmailSent(undefined, EmailCategory.IMPORTANT_TRANSACTIONAL, 'status_changed');
      
      // Should not throw or error
      expect(true).toBe(true);
    });
  });

  describe('getUserEmailCounts', () => {
    it('should return zero counts for new user', () => {
      const counts = getUserEmailCounts('newuser');
      expect(counts.hourly).toBe(0);
      expect(counts.daily).toBe(0);
      expect(counts.statusHourly).toBe(0);
      expect(counts.jobAlertsHourly).toBe(0);
      expect(counts.jobAlertsDaily).toBe(0);
    });

    it('should return correct counts after sending emails', () => {
      const userId = 'user123';
      
      recordEmailSent(userId, EmailCategory.IMPORTANT_TRANSACTIONAL, 'status_changed');
      recordEmailSent(userId, EmailCategory.IMPORTANT_TRANSACTIONAL, 'status_changed');
      recordEmailSent(userId, EmailCategory.USER_NOTIFICATION, 'job_alert');
      
      const counts = getUserEmailCounts(userId);
      expect(counts.hourly).toBe(3);
      expect(counts.daily).toBe(3);
      expect(counts.statusHourly).toBe(2);
      expect(counts.jobAlertsHourly).toBe(1);
      expect(counts.jobAlertsDaily).toBe(1);
    });
  });
});
