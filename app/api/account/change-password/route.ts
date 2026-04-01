import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { requireAuthAsync } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// POST - Change user password
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthAsync(request);
    await connectDB();

    const userData = await User.findById(user.userId);
    
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    // Verify current password
    if (!userData.password || typeof userData.password !== 'string') {
      return NextResponse.json(
        { error: 'Password not set for this account' },
        { status: 400 }
      );
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, userData.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Hash and update password
    const hashed = await bcrypt.hash(newPassword, 10);
    userData.password = hashed;
    userData.set('providers.credentials.passwordHash', hashed);
    await userData.save();

    return NextResponse.json(
      { message: 'Password changed successfully' },
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

