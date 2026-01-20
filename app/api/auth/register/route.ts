import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import EmailPreferences from '@/models/EmailPreferences';
import { generateToken } from '@/lib/jwt';
import { sendEmailAsync, EmailCategory } from '@/lib/email';
import { getWelcomeEmail } from '@/lib/emailTemplates';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { email, password, name, role } = await request.json();

    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (!['recruiter', 'job-seeker', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      role,
    });

    // Create default email preferences for new user
    await EmailPreferences.create({
      userId: user._id,
      jobAlerts: 'weekly',
      applicationUpdates: true,
      marketing: false,
    });

    // Send welcome email asynchronously (fire-and-forget)
    // Email goes through canSendEmail() to check preferences
    // Failures are logged but don't block registration
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      
      // Determine dashboard URL based on role
      const dashboardUrl = user.role === 'recruiter' 
        ? `${baseUrl}/recruiter`
        : user.role === 'admin'
        ? `${baseUrl}/admin`
        : `${baseUrl}/job-seeker`;

      const welcomeTemplate = getWelcomeEmail({
        userName: user.name,
        dashboardUrl,
      });

      sendEmailAsync({
        to: user.email,
        subject: welcomeTemplate.subject,
        html: welcomeTemplate.html,
        text: welcomeTemplate.text,
        category: EmailCategory.IMPORTANT_TRANSACTIONAL,
        eventType: 'user_welcome',
        userId: String(user._id),
        tags: [
          { name: 'type', value: 'welcome' },
          { name: 'event', value: 'user_welcome' },
          { name: 'role', value: user.role },
        ],
      });
    } catch (emailError) {
      // Log but don't fail registration if email fails
      console.error('[Registration] Failed to queue welcome email:', emailError);
    }

    const token = generateToken(user);

    const response = NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    );

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

