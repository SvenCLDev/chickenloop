import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { generateToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    // Connect to database with explicit error handling
    try {
      await connectDB();
    } catch (dbError: unknown) {
      const dbErrorMessage = dbError instanceof Error ? dbError.message : 'Unknown error';
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        {
          error: 'Database connection failed',
          details: process.env.NODE_ENV === 'development' ? dbErrorMessage : undefined,
        },
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const emailNormalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const user = await User.findOne({ email: emailNormalized });
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (user.mustResetPassword) {
      return NextResponse.json(
        { error: 'PASSWORD_RESET_REQUIRED' },
        { status: 403 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update lastOnline timestamp
    user.lastOnline = new Date();
    await user.save();

    const token = generateToken(user);

    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 200 }
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
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Login error:', error);
    // Always return JSON, even on errors
    return NextResponse.json(
      {
        error: errorMessage || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

