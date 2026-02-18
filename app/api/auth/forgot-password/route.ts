import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { sendEmail, EmailCategory } from '@/lib/email';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// POST - Request password reset email
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const emailNormalized = email.trim().toLowerCase();
    const user = await User.findOne({ email: emailNormalized }).select('_id email name').lean();

    // Always return success to prevent email enumeration
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    if (user) {
      const resetToken = jwt.sign(
        { userId: String(user._id), purpose: 'password_reset' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

      const result = await sendEmail({
        to: user.email,
        subject: 'Reset your ChickenLoop password',
        html: `
          <p>Hi ${user.name || 'there'},</p>
          <p>You requested a password reset for your ChickenLoop account.</p>
          <p><a href="${resetUrl}">Click here to reset your password</a></p>
          <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        `,
        text: `Hi ${user.name || 'there'},\n\nYou requested a password reset for your ChickenLoop account.\n\nReset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.`,
        category: EmailCategory.CRITICAL_TRANSACTIONAL,
        eventType: 'password_reset',
        userId: String(user._id),
      });

      if (!result.success) {
        console.error('[forgot-password] Email send failed:', result.error);
        return NextResponse.json(
          { error: 'Failed to send reset email. Please try again later.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { message: 'If an account exists with that email, a password reset link has been sent.' },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[forgot-password] Error:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}
