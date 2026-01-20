import { Resend } from 'resend';
import EmailPreferences from '@/models/EmailPreferences';
import User from '@/models/User';
import connectDB from '@/lib/db';
import { generateUnsubscribeUrl } from './unsubscribeToken';
import { checkEmailRateLimit, recordEmailSent } from './emailRateLimit';

/**
 * Email categories for explicit categorization and future suppression logic
 */
export enum EmailCategory {
  CRITICAL_TRANSACTIONAL = 'critical_transactional',
  IMPORTANT_TRANSACTIONAL = 'important_transactional',
  USER_NOTIFICATION = 'user_notification',
  SYSTEM = 'system',
}

// Initialize Resend client
let resend: Resend | null = null;

/**
 * Get or initialize Resend client
 */
function getResendClient(): Resend | null {
  if (resend) {
    return resend;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn('RESEND_API_KEY is not set. Email functionality will be disabled.');
    return null;
  }

  // Validate API key format (should start with 're_')
  if (!apiKey.startsWith('re_')) {
    console.error('RESEND_API_KEY appears to be invalid (should start with "re_")');
    return null;
  }

  resend = new Resend(apiKey);
  return resend;
}

/**
 * Get the default from email address
 */
function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
}

/**
 * Generate unsubscribe footer for non-critical emails
 * @param userId - User ID (required for unsubscribe)
 * @param category - Email category
 * @param userRole - Optional user role to determine correct preferences URL
 * @returns Object with html and text unsubscribe footer, or null if critical
 */
async function generateUnsubscribeFooter(
  userId: string | undefined,
  category: EmailCategory,
  userRole?: string
): Promise<{ html: string; text: string } | null> {
  // Never add unsubscribe links to critical transactional or system emails
  if (
    category === EmailCategory.CRITICAL_TRANSACTIONAL ||
    category === EmailCategory.SYSTEM
  ) {
    return null;
  }

  // If no userId, can't generate unsubscribe link
  if (!userId) {
    return null;
  }

  try {
    const unsubscribeUrl = generateUnsubscribeUrl(userId, category);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    // Determine preferences URL based on user role
    // If role not provided, fetch from database
    let role = userRole;
    if (!role && userId) {
      try {
        // Ensure database connection (might already be connected from canSendEmail)
        await connectDB();
        const user = await User.findById(userId).select('role').lean();
        role = user?.role;
      } catch (error) {
        // If fetch fails, default to job-seeker URL
        console.warn('[Email Footer] Failed to fetch user role, defaulting to job-seeker URL:', error);
      }
    }
    
    // Determine preferences URL based on role
    const preferencesUrl = role === 'recruiter'
      ? `${baseUrl}/recruiter/account/edit`
      : role === 'job-seeker'
      ? `${baseUrl}/job-seeker/account/edit`
      : `${baseUrl}/job-seeker/account/edit`; // Default fallback

    const html = `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
          You're receiving this email because of your account activity on Chickenloop.<br />
          <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe from these emails</a> | 
          <a href="${preferencesUrl}" style="color: #6b7280; text-decoration: underline;">Manage email preferences</a>
        </p>
      </div>
    `;

    const text = `\n\n---\nYou're receiving this email because of your account activity on Chickenloop.\nUnsubscribe: ${unsubscribeUrl}\nManage preferences: ${preferencesUrl}`;

    return { html, text };
  } catch (error) {
    // If token generation fails, don't break the email
    console.error('Error generating unsubscribe footer:', error);
    return null;
  }
}

/**
 * Central email suppression gate
 * Checks user email preferences and category rules
 * 
 * @param userId - User ID (optional, for user-specific preferences)
 * @param category - Email category
 * @param eventType - Stable event type identifier
 * @returns Object with canSend (boolean) and reason (string) if suppressed
 */
export async function canSendEmail(
  userId: string | undefined,
  category: EmailCategory,
  eventType: string
): Promise<{ canSend: boolean; reason?: string }> {
  // CRITICAL_TRANSACTIONAL: Always send (password resets, account verification, etc.)
  if (category === EmailCategory.CRITICAL_TRANSACTIONAL) {
    return { canSend: true };
  }

  // SYSTEM: Always send (admin/system notifications, contact forms)
  if (category === EmailCategory.SYSTEM) {
    return { canSend: true };
  }

  // If no userId provided, allow email (anonymous users can't have preferences)
  if (!userId) {
    return { canSend: true };
  }

  try {
    // Fetch user email preferences
    const preferences = await EmailPreferences.findOne({ userId }).lean();

    // If no preferences found, use defaults (allow email)
    // This handles legacy users who don't have preferences yet
    if (!preferences) {
      return { canSend: true };
    }

    // IMPORTANT_TRANSACTIONAL: Check applicationUpdates preference
    if (category === EmailCategory.IMPORTANT_TRANSACTIONAL) {
      if (!preferences.applicationUpdates) {
        return {
          canSend: false,
          reason: 'User has disabled application update emails',
        };
      }
      return { canSend: true };
    }

    // USER_NOTIFICATION: Check jobAlerts or marketing preference
    if (category === EmailCategory.USER_NOTIFICATION) {
      // Job alerts
      if (eventType === 'job_alert') {
        if (preferences.jobAlerts === 'never') {
          return {
            canSend: false,
            reason: 'User has disabled job alerts',
          };
        }
        // 'daily' and 'weekly' are handled by cron job frequency
        return { canSend: true };
      }

      // Marketing emails
      if (eventType.startsWith('marketing_') || eventType === 'marketing') {
        if (!preferences.marketing) {
          return {
            canSend: false,
            reason: 'User has disabled marketing emails',
          };
        }
        return { canSend: true };
      }

      // Other user notifications: allow by default
      return { canSend: true };
    }

    // Default: allow email
    return { canSend: true };
  } catch (error) {
    // On error, allow email (fail open to avoid breaking functionality)
    console.error('Error checking email preferences:', error);
    return { canSend: true };
  }
}

/**
 * Send a transactional email using Resend
 */
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  tags?: Array<{ name: string; value: string }>;
  // Required: Email categorization for future suppression logic
  category: EmailCategory;
  // Required: Stable event type identifier (e.g., 'candidate_applied', 'status_changed')
  eventType: string;
  // Optional: User ID for preference checking (if applicable)
  userId?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { category, eventType, userId, to, subject, html, text, from, replyTo, cc, bcc, tags } = options;

    // Check if email should be sent (central enforcement gate)
    const { canSend, reason } = await canSendEmail(userId, category, eventType);
    if (!canSend) {
      const recipients = Array.isArray(to) ? to.join(', ') : to;
      console.log(`[Email Suppressed] category=${category}, eventType=${eventType}, userId=${userId || 'anonymous'}, to=${recipients}, reason=${reason || 'unknown'}`);
      return {
        success: true, // Return success to avoid breaking callers
        messageId: undefined,
      };
    }

    // Check rate limits (soft limit - logs but doesn't block)
    const rateLimitCheck = checkEmailRateLimit(userId, category, eventType);
    if (rateLimitCheck.reason) {
      const recipients = Array.isArray(to) ? to.join(', ') : to;
      console.warn(
        `[Email Rate Limit Warning] category=${category}, eventType=${eventType}, userId=${userId || 'anonymous'}, to=${recipients}, ` +
        `reason=${rateLimitCheck.reason}, counts=${JSON.stringify(rateLimitCheck.counts || {})}`
      );
      // Continue to send (soft limit)
    }

    // Record email sent (increment counters)
    recordEmailSent(userId, category, eventType);

    // Log email send with categorization
    const recipients = Array.isArray(to) ? to.join(', ') : to;
    console.log(`[Email Sent] category=${category}, eventType=${eventType}, userId=${userId || 'anonymous'}, to=${recipients}`);

    const client = getResendClient();
    if (!client) {
      return {
        success: false,
        error: 'Email service is not configured. Please set RESEND_API_KEY in your environment variables.',
      };
    }

    // Ensure we have either html or text content
    if (!html && !text) {
      return {
        success: false,
        error: 'Either html or text content is required.',
      };
    }

    // Generate unsubscribe footer for non-critical emails
    const unsubscribeFooter = await generateUnsubscribeFooter(userId, category);
    
    // Append unsubscribe footer to content
    let finalHtml = html;
    let finalText = text;
    
    if (unsubscribeFooter) {
      if (finalHtml) {
        finalHtml = finalHtml + unsubscribeFooter.html;
      }
      if (finalText) {
        finalText = finalText + unsubscribeFooter.text;
      }
    }

    // Build email payload - Resend requires at least one of html or text
    const emailPayload: {
      from: string;
      to: string[];
      subject: string;
      html?: string;
      text?: string;
      replyTo?: string;
      cc?: string[];
      bcc?: string[];
      tags?: Array<{ name: string; value: string }>;
    } = {
      from: from || getFromEmail(),
      to: Array.isArray(to) ? to : [to],
      subject,
    };

    // Add html or text (at least one is required)
    if (finalHtml) {
      emailPayload.html = finalHtml;
    }
    if (finalText) {
      emailPayload.text = finalText;
    }

    // Add optional fields
    if (replyTo) {
      emailPayload.replyTo = replyTo;
    }

    if (cc) {
      emailPayload.cc = Array.isArray(cc) ? cc : [cc];
    }

    if (bcc) {
      emailPayload.bcc = Array.isArray(bcc) ? bcc : [bcc];
    }

    if (tags) {
      emailPayload.tags = tags;
    }

    // Send email with type assertion for compatibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await client.emails.send(emailPayload as any);

    if (result.error) {
      console.error('Resend API error:', result.error);
      return {
        success: false,
        error: result.error.message || 'Failed to send email',
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending email:', error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send a test email to verify email configuration
 */
export async function sendTestEmail(to: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendEmail({
    to,
    subject: 'Test Email from Chickenloop',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Test Email</h2>
        <p>This is a test email from the Chickenloop platform.</p>
        <p>If you received this email, your email configuration is working correctly!</p>
        <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">
          Sent at: ${new Date().toLocaleString()}<br />
          From: ${getFromEmail()}
        </p>
      </div>
    `,
    text: `Test Email\n\nThis is a test email from the Chickenloop platform.\n\nIf you received this email, your email configuration is working correctly!\n\nSent at: ${new Date().toLocaleString()}\nFrom: ${getFromEmail()}`,
    category: EmailCategory.SYSTEM,
    eventType: 'test_email',
  });
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Send email asynchronously via internal endpoint (fire-and-forget)
 * This decouples email sending from API request lifecycles
 * 
 * @param options - Email options
 * @returns Promise that resolves immediately (doesn't wait for email delivery)
 */
export async function sendEmailAsync(options: SendEmailOptions): Promise<void> {
  try {
    // Get base URL for internal endpoint
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const internalEndpoint = `${baseUrl}/api/internal/send-email`;

    // Fire-and-forget: don't await the response
    fetch(internalEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    }).catch((error) => {
      // Log errors but don't throw - email failures shouldn't affect API responses
      console.error('[Send Email Async] Failed to call internal endpoint:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        endpoint: internalEndpoint,
        category: options.category,
        eventType: options.eventType,
        to: options.to,
      });
    });

    // Log that email was queued (not necessarily sent yet)
    const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;
    console.log(
      `[Email Queued] category=${options.category}, ` +
      `eventType=${options.eventType}, ` +
      `userId=${options.userId || 'anonymous'}, ` +
      `to=${recipients}`
    );
  } catch (error) {
    // Log but don't throw - email failures shouldn't affect API responses
    console.error('[Send Email Async] Error queuing email:', error);
  }
}

