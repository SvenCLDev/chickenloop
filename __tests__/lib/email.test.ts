import { canSendEmail, EmailCategory } from '@/lib/email';
import EmailPreferences from '@/models/EmailPreferences';
import connectDB from '@/lib/db';
import mongoose from 'mongoose';

describe('canSendEmail', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear email preferences between tests
    await EmailPreferences.deleteMany({});
  });

  describe('CRITICAL_TRANSACTIONAL category', () => {
    it('should always return true for critical transactional emails', async () => {
      const result = await canSendEmail(
        'user123',
        EmailCategory.CRITICAL_TRANSACTIONAL,
        'password_reset'
      );
      expect(result.canSend).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should ignore user preferences for critical emails', async () => {
      // Create preferences that would normally suppress
      const userId = new mongoose.Types.ObjectId();
      await EmailPreferences.create({
        userId,
        jobAlerts: 'never',
        applicationUpdates: false,
        marketing: false,
      });

      const result = await canSendEmail(
        userId.toString(),
        EmailCategory.CRITICAL_TRANSACTIONAL,
        'account_verification'
      );
      expect(result.canSend).toBe(true);
    });
  });

  describe('SYSTEM category', () => {
    it('should always return true for system emails', async () => {
      const result = await canSendEmail(
        'user123',
        EmailCategory.SYSTEM,
        'contact_form_submission'
      );
      expect(result.canSend).toBe(true);
    });

    it('should allow system emails even without userId', async () => {
      const result = await canSendEmail(
        undefined,
        EmailCategory.SYSTEM,
        'contact_form_submission'
      );
      expect(result.canSend).toBe(true);
    });
  });

  describe('IMPORTANT_TRANSACTIONAL category', () => {
    it('should allow when applicationUpdates is true', async () => {
      const userId = new mongoose.Types.ObjectId();
      await EmailPreferences.create({
        userId,
        jobAlerts: 'weekly',
        applicationUpdates: true,
        marketing: false,
      });

      const result = await canSendEmail(
        userId.toString(),
        EmailCategory.IMPORTANT_TRANSACTIONAL,
        'status_changed'
      );
      expect(result.canSend).toBe(true);
    });

    it('should suppress when applicationUpdates is false', async () => {
      const userId = new mongoose.Types.ObjectId();
      await EmailPreferences.create({
        userId,
        jobAlerts: 'weekly',
        applicationUpdates: false,
        marketing: false,
      });

      const result = await canSendEmail(
        userId.toString(),
        EmailCategory.IMPORTANT_TRANSACTIONAL,
        'candidate_applied'
      );
      expect(result.canSend).toBe(false);
      expect(result.reason).toBe('User has disabled application update emails');
    });

    it('should allow when no preferences found (legacy user)', async () => {
      const userId = new mongoose.Types.ObjectId();
      // Don't create preferences

      const result = await canSendEmail(
        userId.toString(),
        EmailCategory.IMPORTANT_TRANSACTIONAL,
        'status_changed'
      );
      expect(result.canSend).toBe(true);
    });

    it('should allow when userId is undefined (anonymous)', async () => {
      const result = await canSendEmail(
        undefined,
        EmailCategory.IMPORTANT_TRANSACTIONAL,
        'status_changed'
      );
      expect(result.canSend).toBe(true);
    });
  });

  describe('USER_NOTIFICATION category', () => {
    describe('job_alert eventType', () => {
      it('should allow when jobAlerts is daily', async () => {
        const userId = new mongoose.Types.ObjectId();
        await EmailPreferences.create({
          userId,
          jobAlerts: 'daily',
          applicationUpdates: true,
          marketing: false,
        });

        const result = await canSendEmail(
          userId.toString(),
          EmailCategory.USER_NOTIFICATION,
          'job_alert'
        );
        expect(result.canSend).toBe(true);
      });

      it('should allow when jobAlerts is weekly', async () => {
        const userId = new mongoose.Types.ObjectId();
        await EmailPreferences.create({
          userId,
          jobAlerts: 'weekly',
          applicationUpdates: true,
          marketing: false,
        });

        const result = await canSendEmail(
          userId.toString(),
          EmailCategory.USER_NOTIFICATION,
          'job_alert'
        );
        expect(result.canSend).toBe(true);
      });

      it('should suppress when jobAlerts is never', async () => {
        const userId = new mongoose.Types.ObjectId();
        await EmailPreferences.create({
          userId,
          jobAlerts: 'never',
          applicationUpdates: true,
          marketing: false,
        });

        const result = await canSendEmail(
          userId.toString(),
          EmailCategory.USER_NOTIFICATION,
          'job_alert'
        );
        expect(result.canSend).toBe(false);
        expect(result.reason).toBe('User has disabled job alerts');
      });
    });

    describe('marketing eventType', () => {
      it('should allow when marketing is true', async () => {
        const userId = new mongoose.Types.ObjectId();
        await EmailPreferences.create({
          userId,
          jobAlerts: 'weekly',
          applicationUpdates: true,
          marketing: true,
        });

        const result = await canSendEmail(
          userId.toString(),
          EmailCategory.USER_NOTIFICATION,
          'marketing_newsletter'
        );
        expect(result.canSend).toBe(true);
      });

      it('should suppress when marketing is false', async () => {
        const userId = new mongoose.Types.ObjectId();
        await EmailPreferences.create({
          userId,
          jobAlerts: 'weekly',
          applicationUpdates: true,
          marketing: false,
        });

        const result = await canSendEmail(
          userId.toString(),
          EmailCategory.USER_NOTIFICATION,
          'marketing_newsletter'
        );
        expect(result.canSend).toBe(false);
        expect(result.reason).toBe('User has disabled marketing emails');
      });
    });

    it('should allow other user notifications by default', async () => {
      const userId = new mongoose.Types.ObjectId();
      await EmailPreferences.create({
        userId,
        jobAlerts: 'weekly',
        applicationUpdates: true,
        marketing: false,
      });

      const result = await canSendEmail(
        userId.toString(),
        EmailCategory.USER_NOTIFICATION,
        'other_notification'
      );
      expect(result.canSend).toBe(true);
    });
  });
});
