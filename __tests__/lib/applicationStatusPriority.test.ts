import {
  getStatusPriority,
  getHigherPriorityStatus,
  shouldNotifyStatus,
  shouldSuppressStatusEmail,
  STATUS_EMAIL_SUPPRESSION_WINDOW_MS,
  ApplicationStatus,
} from '@/lib/applicationStatusPriority';

describe('applicationStatusPriority', () => {
  describe('getStatusPriority', () => {
    it('should return correct priority for notified statuses', () => {
      expect(getStatusPriority('offered')).toBe(4);
      expect(getStatusPriority('interviewing')).toBe(3);
      expect(getStatusPriority('contacted')).toBe(2);
      expect(getStatusPriority('rejected')).toBe(1);
    });

    it('should return 0 for non-notified statuses', () => {
      expect(getStatusPriority('applied')).toBe(0);
      expect(getStatusPriority('viewed')).toBe(0);
      expect(getStatusPriority('hired')).toBe(0);
      expect(getStatusPriority('accepted')).toBe(0);
      expect(getStatusPriority('withdrawn')).toBe(0);
    });
  });

  describe('getHigherPriorityStatus', () => {
    it('should return status with higher priority', () => {
      expect(getHigherPriorityStatus('contacted', 'offered')).toBe('offered');
      expect(getHigherPriorityStatus('offered', 'contacted')).toBe('offered');
      expect(getHigherPriorityStatus('interviewing', 'rejected')).toBe('interviewing');
      expect(getHigherPriorityStatus('rejected', 'interviewing')).toBe('interviewing');
    });

    it('should return first status if priorities are equal', () => {
      expect(getHigherPriorityStatus('contacted', 'contacted')).toBe('contacted');
      expect(getHigherPriorityStatus('rejected', 'rejected')).toBe('rejected');
    });

    it('should handle non-notified statuses', () => {
      expect(getHigherPriorityStatus('applied', 'offered')).toBe('offered');
      expect(getHigherPriorityStatus('viewed', 'contacted')).toBe('contacted');
    });
  });

  describe('shouldNotifyStatus', () => {
    it('should return true for notified statuses', () => {
      expect(shouldNotifyStatus('offered')).toBe(true);
      expect(shouldNotifyStatus('interviewing')).toBe(true);
      expect(shouldNotifyStatus('contacted')).toBe(true);
      expect(shouldNotifyStatus('rejected')).toBe(true);
    });

    it('should return false for non-notified statuses', () => {
      expect(shouldNotifyStatus('applied')).toBe(false);
      expect(shouldNotifyStatus('viewed')).toBe(false);
      expect(shouldNotifyStatus('hired')).toBe(false);
      expect(shouldNotifyStatus('accepted')).toBe(false);
      expect(shouldNotifyStatus('withdrawn')).toBe(false);
    });
  });

  describe('shouldSuppressStatusEmail', () => {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - STATUS_EMAIL_SUPPRESSION_WINDOW_MS);
    const thirtyOneMinutesAgo = new Date(now.getTime() - STATUS_EMAIL_SUPPRESSION_WINDOW_MS - 60000);
    const fifteenMinutesAgo = new Date(now.getTime() - (STATUS_EMAIL_SUPPRESSION_WINDOW_MS / 2));

    describe('no previous email', () => {
      it('should not suppress if no previous email sent', () => {
        const result = shouldSuppressStatusEmail(undefined, 'contacted', undefined);
        expect(result.shouldSuppress).toBe(false);
      });

      it('should not suppress if lastStatusEmailSentAt is null', () => {
        const result = shouldSuppressStatusEmail(null, 'contacted', null);
        expect(result.shouldSuppress).toBe(false);
      });
    });

    describe('outside suppression window', () => {
      it('should not suppress if last email was sent more than 30 minutes ago', () => {
        const result = shouldSuppressStatusEmail(thirtyOneMinutesAgo, 'contacted', 'contacted');
        expect(result.shouldSuppress).toBe(false);
      });
    });

    describe('within suppression window - priority checks', () => {
      it('should suppress lower priority status within window', () => {
        const result = shouldSuppressStatusEmail(
          fifteenMinutesAgo,
          'contacted', // Priority 2
          'interviewing' // Priority 3 (higher)
        );
        expect(result.shouldSuppress).toBe(true);
        expect(result.reason).toContain('lower or equal priority');
      });

      it('should not suppress higher priority status within window', () => {
        const result = shouldSuppressStatusEmail(
          fifteenMinutesAgo,
          'offered', // Priority 4 (higher)
          'contacted' // Priority 2
        );
        expect(result.shouldSuppress).toBe(false);
        expect(result.higherPriorityStatus).toBe('offered');
      });

      it('should suppress equal priority status within window', () => {
        const result = shouldSuppressStatusEmail(
          fifteenMinutesAgo,
          'contacted', // Priority 2
          'contacted' // Priority 2 (equal)
        );
        expect(result.shouldSuppress).toBe(true);
        expect(result.reason).toContain('lower or equal priority');
      });

      it('should allow highest priority (offered) to replace any other status', () => {
        const result = shouldSuppressStatusEmail(
          fifteenMinutesAgo,
          'offered', // Priority 4 (highest)
          'interviewing' // Priority 3
        );
        expect(result.shouldSuppress).toBe(false);
        expect(result.higherPriorityStatus).toBe('offered');
      });

      it('should suppress rejected when higher priority was already sent', () => {
        const result = shouldSuppressStatusEmail(
          fifteenMinutesAgo,
          'rejected', // Priority 1 (lowest)
          'offered' // Priority 4 (highest)
        );
        expect(result.shouldSuppress).toBe(true);
      });
    });

    describe('priority order verification', () => {
      it('should respect priority order: offered > interviewing > contacted > rejected', () => {
        // offered should not be suppressed by any other
        expect(shouldSuppressStatusEmail(fifteenMinutesAgo, 'offered', 'interviewing').shouldSuppress).toBe(false);
        expect(shouldSuppressStatusEmail(fifteenMinutesAgo, 'offered', 'contacted').shouldSuppress).toBe(false);
        expect(shouldSuppressStatusEmail(fifteenMinutesAgo, 'offered', 'rejected').shouldSuppress).toBe(false);

        // interviewing should suppress contacted and rejected, but not offered
        expect(shouldSuppressStatusEmail(fifteenMinutesAgo, 'interviewing', 'offered').shouldSuppress).toBe(true);
        expect(shouldSuppressStatusEmail(fifteenMinutesAgo, 'interviewing', 'contacted').shouldSuppress).toBe(false);
        expect(shouldSuppressStatusEmail(fifteenMinutesAgo, 'interviewing', 'rejected').shouldSuppress).toBe(false);

        // contacted should suppress rejected, but not interviewing or offered
        expect(shouldSuppressStatusEmail(fifteenMinutesAgo, 'contacted', 'offered').shouldSuppress).toBe(true);
        expect(shouldSuppressStatusEmail(fifteenMinutesAgo, 'contacted', 'interviewing').shouldSuppress).toBe(true);
        expect(shouldSuppressStatusEmail(fifteenMinutesAgo, 'contacted', 'rejected').shouldSuppress).toBe(false);

        // rejected should be suppressed by all others
        expect(shouldSuppressStatusEmail(fifteenMinutesAgo, 'rejected', 'offered').shouldSuppress).toBe(true);
        expect(shouldSuppressStatusEmail(fifteenMinutesAgo, 'rejected', 'interviewing').shouldSuppress).toBe(true);
        expect(shouldSuppressStatusEmail(fifteenMinutesAgo, 'rejected', 'contacted').shouldSuppress).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should suppress if within window but lastStatusNotified is unknown', () => {
        const result = shouldSuppressStatusEmail(fifteenMinutesAgo, 'contacted', undefined);
        expect(result.shouldSuppress).toBe(true);
        expect(result.reason).toContain('suppression window');
      });

      it('should suppress if within window but lastStatusNotified is null', () => {
        const result = shouldSuppressStatusEmail(fifteenMinutesAgo, 'contacted', null);
        expect(result.shouldSuppress).toBe(true);
        expect(result.reason).toContain('suppression window');
      });
    });
  });
});
