import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { requireAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// PUT - Update user account (name and email)
export async function PUT(request: NextRequest) {
  try {
    const user = requireAuth(request);
    await connectDB();

    const userData = await User.findById(user.userId);

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { name, email } = await request.json();

    if (name) {
      userData.name = name;
    }
    if (email) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser && String(existingUser._id) !== user.userId) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
      userData.email = email.toLowerCase().trim();
    }

    await userData.save();

    const updatedUser = await User.findById(user.userId).select('-password');

    return NextResponse.json(
      { message: 'Account updated successfully', user: updatedUser },
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

// DELETE - Delete user account
export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request);
    await connectDB();

    const userData = await User.findById(user.userId);

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete associated data based on role
    if (userData.role === 'job-seeker') {
      const CV = (await import('@/models/CV')).default;
      await CV.deleteMany({ jobSeeker: userData._id });
    } else if (userData.role === 'recruiter') {
      const Job = (await import('@/models/Job')).default;
      await Job.deleteMany({ recruiter: userData._id });
      const Company = (await import('@/models/Company')).default;
      await Company.deleteMany({ recruiter: userData._id });
    }

    // Delete the user
    await User.findByIdAndDelete(user.userId);

    return NextResponse.json(
      { message: 'Account deleted successfully' },
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






