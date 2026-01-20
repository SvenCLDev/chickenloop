import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, EmailCategory, SendEmailOptions } from '@/lib/email';

/**
 * Internal endpoint for sending emails asynchronously
 * This endpoint is called via fire-and-forget fetch() from API routes
 * to decouple email sending from request lifecycles
 * 
 * Security: Should only be called from internal server-side code
 * (Vercel serverless functions can call this via internal URL)
 */
export async function POST(request: NextRequest) {
  try {
    const emailData: SendEmailOptions = await request.json();

    // Validate required fields
    if (!emailData.to || !emailData.subject || !emailData.category || !emailData.eventType) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, category, eventType' },
        { status: 400 }
      );
    }

    // Send email (this will check preferences and handle suppression)
    const result = await sendEmail(emailData);

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          messageId: result.messageId,
        },
        { status: 200 }
      );
    } else {
      // Log error but return success to avoid retries
      console.error('[Internal Send Email] Failed to send email:', {
        to: emailData.to,
        category: emailData.category,
        eventType: emailData.eventType,
        error: result.error,
      });

      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 200 } // Return 200 to prevent retries
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Internal Send Email] Error processing request:', error);

    // Return 200 to prevent retries - errors are logged but not thrown
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 200 }
    );
  }
}
