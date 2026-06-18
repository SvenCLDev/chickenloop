import connectDB from '@/lib/db';
import User from '@/models/User';

const TRACKED_ROLES = new Set(['recruiter', 'job-seeker']);

/**
 * Increment login count and update lastOnline for recruiters and job seekers.
 * Safe to call from auth flows; failures are logged and do not block login.
 */
export async function recordUserLogin(userId: string): Promise<void> {
  try {
    await connectDB();
    await User.updateOne(
      {
        _id: userId,
        role: { $in: [...TRACKED_ROLES] },
      },
      {
        $inc: { loginCount: 1 },
        $set: { lastOnline: new Date() },
      }
    );
  } catch (error) {
    console.error('[recordUserLogin] Failed to record login for user', userId, error);
  }
}
