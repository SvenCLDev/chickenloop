import { NextRequest, NextResponse } from 'next/server';
import { sendTestEmail, isEmailConfigured } from '@/lib/email';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/email/test
 * Send a test email to verify email configuration
 * Requires authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = requireAuth(request);

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      );
    }

    // Check if email is configured
    if (!isEmailConfigured()) {
      return NextResponse.json(
        {
          error: 'Email service is not configured. Please set RESEND_API_KEY in your environment variables.',
          configured: false,
        },
        { status: 503 }
      );
    }

    // Send test email
    const result = await sendTestEmail(email);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to send test email',
          configured: true,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Test email sent successfully',
        messageId: result.messageId,
        configured: true,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('[API /email/test] Error:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/email/test
 * Check if email service is configured
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    requireAuth(request);

    const configured = isEmailConfigured();

    return NextResponse.json(
      {
        configured,
        message: configured
          ? 'Email service is configured and ready to use'
          : 'Email service is not configured. Please set RESEND_API_KEY in your environment variables.',
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}




