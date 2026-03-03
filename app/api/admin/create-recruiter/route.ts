import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { requireRole } from '@/lib/auth';

// POST - Create a new recruiter user (admin only)
export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);
    await connectDB();

    const body = await request.json();
    const { email, name } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'email is required and must be a string' },
        { status: 400 }
      );
    }
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'name is required and must be a string' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedEmail) {
      return NextResponse.json(
        { error: 'email is required' },
        { status: 400 }
      );
    }
    if (!trimmedName) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    const password = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: trimmedEmail,
      password: hashedPassword,
      name: trimmedName,
      role: 'recruiter',
      mustResetPassword: true,
      passwordMigrated: true,
    });

    const userObj = user.toObject();

    return NextResponse.json(
      {
        message: 'Recruiter created successfully',
        user: {
          id: userObj._id,
          email: userObj.email,
          name: userObj.name,
          role: userObj.role,
          mustResetPassword: userObj.mustResetPassword,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'PASSWORD_RESET_REQUIRED') {
      return NextResponse.json({ error: 'PASSWORD_RESET_REQUIRED' }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'COMPANY_PROFILE_INCOMPLETE') {
      return NextResponse.json(
        { error: 'COMPANY_PROFILE_INCOMPLETE' },
        { status: 403 }
      );
    }
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}
