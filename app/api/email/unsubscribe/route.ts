import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyUnsubscribeToken } from '@/lib/unsubscribeToken';
import { EmailCategory } from '@/lib/email';
import EmailPreferences from '@/models/EmailPreferences';
import User from '@/models/User';
import mongoose from 'mongoose';

/**
 * GET /api/email/unsubscribe?token=...
 * Unsubscribe a user from a specific email category
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      return NextResponse.redirect(`${baseUrl}/email/unsubscribed?error=missing_token`, 302);
    }

    // Verify and decode token
    let tokenPayload;
    try {
      tokenPayload = verifyUnsubscribeToken(token);
    } catch (error) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      const errorType = error instanceof Error && error.message.includes('expired') ? 'expired_token' : 'invalid_token';
      return NextResponse.redirect(`${baseUrl}/email/unsubscribed?error=${errorType}`, 302);
    }

    const { userId, category } = tokenPayload;

    // Prevent unsubscribing from critical transactional emails
    if (category === EmailCategory.CRITICAL_TRANSACTIONAL) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      return NextResponse.redirect(`${baseUrl}/email/unsubscribed?error=critical_not_allowed`, 302);
    }

    // Prevent unsubscribing from system emails (they're always sent)
    if (category === EmailCategory.SYSTEM) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      return NextResponse.redirect(`${baseUrl}/email/unsubscribed?error=system_not_allowed`, 302);
    }

    // Validate userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      return NextResponse.redirect(`${baseUrl}/email/unsubscribed?error=invalid_user`, 302);
    }

    // Find or create email preferences
    let preferences = await EmailPreferences.findOne({ userId });
    
    if (!preferences) {
      // Create preferences with defaults, then update
      preferences = await EmailPreferences.create({
        userId,
        jobAlerts: 'weekly',
        applicationUpdates: true,
        marketing: false,
      });
    }

    // Update preferences based on category
    let updated = false;
    let preferenceField = '';
    let alreadyUnsubscribed = false;

    if (category === EmailCategory.IMPORTANT_TRANSACTIONAL) {
      if (preferences.applicationUpdates) {
        preferences.applicationUpdates = false;
        updated = true;
        preferenceField = 'applicationUpdates';
      } else {
        alreadyUnsubscribed = true;
      }
    } else if (category === EmailCategory.USER_NOTIFICATION) {
      // For user notifications, disable job alerts
      // (Most USER_NOTIFICATION emails are job alerts)
      // Marketing emails can be disabled separately via dashboard preferences
      if (preferences.jobAlerts !== 'never') {
        preferences.jobAlerts = 'never';
        updated = true;
        preferenceField = 'jobAlerts';
      } else {
        alreadyUnsubscribed = true;
      }
    }

    if (updated) {
      await preferences.save();
    }

    // Get user role to determine redirect URL
    const user = await User.findById(userId).select('role');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    // Redirect to user-friendly unsubscribe confirmation page
    const redirectUrl = `${baseUrl}/email/unsubscribed?category=${encodeURIComponent(category)}&role=${encodeURIComponent(user?.role || 'job-seeker')}&updated=${updated}`;
    
    return NextResponse.redirect(redirectUrl, 302);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Unsubscribe] Error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    return NextResponse.redirect(`${baseUrl}/email/unsubscribed?error=server_error`, 302);
  }
}
