/**
 * User Registration API Route
 * 
 * This endpoint creates a new user account in the system. Upon successful registration,
 * it automatically logs in the user by issuing a JWT token stored in an HTTP-only cookie.
 * 
 * @endpoint POST /api/auth/register
 * @access Public
 * 
 * @requestBody
 * {
 *   email: string;    // User's email address (must be unique)
 *   password: string; // User's password (will be hashed before storage)
 *   name: string;     // User's full name or display name
 *   role: "recruiter" | "job-seeker" | "admin"; // User's role in the system
 * }
 * 
 * @response Success (201)
 * {
 *   message: "User created successfully",
 *   user: {
 *     id: string;
 *     email: string;
 *     name: string;
 *     role: "recruiter" | "job-seeker" | "admin";
 *   }
 * }
 * 
 * @response Error (400) - Missing fields, invalid role, or email already exists
 * @response Error (500) - Server/database error
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { generateToken } from '@/lib/jwt';

/**
 * POST handler for user registration
 * 
 * Creates a new user account with hashed password, validates input,
 * and automatically logs in the user by setting a JWT cookie.
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { email, password, name, role } = await request.json();

    // Validate all required fields are present
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate role is one of the allowed values
    if (!['recruiter', 'job-seeker', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password with bcrypt (salt rounds: 10)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user in database
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      role,
    });

    // Generate JWT token for auto-login
    const token = generateToken(user);

    // Prepare success response
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

    // Set JWT token as HTTP-only cookie (auto-login)
    response.cookies.set('token', token, {
      httpOnly: true, // Prevents JavaScript access to cookie
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'lax', // CSRF protection
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

