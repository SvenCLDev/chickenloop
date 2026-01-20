import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, isEmailConfigured, EmailCategory } from '@/lib/email';

// POST - Send contact/feedback email using Resend
export async function POST(request: NextRequest) {
  try {
    const { name, email, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
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

    // Check if email service is configured
    if (!isEmailConfigured()) {
      // Log the submission for manual processing if email service is not configured
      console.log('Contact Form Submission (Email service not configured):', {
        to: 'hello@chickenloop.com',
        from: email,
        name,
        message,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        { 
          error: 'Email service is not configured. Please contact support directly at hello@chickenloop.com',
          fallback: true 
        },
        { status: 503 }
      );
    }

    // Get the contact email from environment or use default
    const contactEmail = process.env.CONTACT_EMAIL || 'hello@chickenloop.com';

    // Send email using Resend
    const result = await sendEmail({
      to: contactEmail,
      replyTo: email,
      subject: `Feedback from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb; margin-bottom: 20px;">New Feedback Submission</h2>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${name}</p>
            <p style="margin: 0 0 10px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a></p>
            <p style="margin: 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h3 style="color: #374151; margin-top: 0;">Message:</h3>
            <p style="white-space: pre-wrap; margin: 0; color: #4b5563; line-height: 1.6;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>
          </div>
        </div>
      `,
      text: `Feedback from ${name} (${email})\n\nDate: ${new Date().toLocaleString()}\n\nMessage:\n${message}`,
      category: EmailCategory.SYSTEM,
      eventType: 'contact_form_submission',
      tags: [
        { name: 'type', value: 'contact' },
        { name: 'source', value: 'contact-form' },
      ],
    });

    if (!result.success) {
      console.error('Failed to send contact email:', result.error);
      return NextResponse.json(
        { 
          error: result.error || 'Failed to send message. Please try again.',
          fallback: false 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Thank you for your feedback! We will get back to you soon.',
        messageId: result.messageId 
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing contact form:', error);
    return NextResponse.json(
      { error: errorMessage || 'Failed to send message. Please try again.' },
      { status: 500 }
    );
  }
}

