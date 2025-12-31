/**
 * Authentication Login API Route
 * 
 * This endpoint authenticates users and creates a session by issuing a JWT token.
 * The token is stored in an HTTP-only cookie for security and returned in the response.
 * 
 * @endpoint POST /api/auth/login
 * @access Public
 * 
 * @requestBody
 * {
 *   email: string;    // User's email address
 *   password: string; // User's password (will be compared with hashed password)
 * }
 * 
 * @response Success (200)
 * {
 *   message: "Login successful",
 *   user: {
 *     id: string;
 *     email: string;
 *     name: string;
 *     role: "recruiter" | "job-seeker" | "admin";
 *   }
 * }
 * 
 * @response Error (400) - Missing credentials
 * @response Error (401) - Invalid credentials
 * @response Error (500) - Server/database error
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { generateToken } from '@/lib/jwt';

/**
 * POST handler for user login
 * 
 * Authenticates a user by verifying their email and password,
 * then generates a JWT token and sets it as an HTTP-only cookie.
 * Also updates the user's lastOnline timestamp.
 */
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

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password using bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update lastOnline timestamp for analytics
    user.lastOnline = new Date();
    await user.save();

    // Generate JWT token with user information
    const token = generateToken(user);

    // Prepare success response with user data (excluding sensitive fields)
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

    // Set JWT token as HTTP-only cookie for security
    response.cookies.set('token', token, {
      httpOnly: true, // Prevents JavaScript access to cookie
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'lax', // CSRF protection
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

