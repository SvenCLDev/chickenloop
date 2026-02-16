import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Job from '@/models/Job';
import CV from '@/models/CV';
import bcrypt from 'bcryptjs';
import { requireRole } from '@/lib/auth';
import { createDeleteAuditLog } from '@/lib/audit';

// GET - Get a single user with all their data (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, ['admin']);
    await connectDB();
    const { id } = await params;

    const user = await User.findById(id).select('-password');
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let additionalData: any = {};

    if (user.role === 'recruiter') {
      const jobs = await Job.find({ recruiter: user._id });
      additionalData.jobs = jobs;
    } else if (user.role === 'job-seeker') {
      const cv = await CV.findOne({ jobSeeker: user._id });
      additionalData.cv = cv;
    }

    return NextResponse.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        ...additionalData,
      },
    });
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

// PUT - Update a user (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, ['admin']);
    await connectDB();
    const { id } = await params;

    const user = await User.findById(id);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { email, name, role, password } = await request.json();

    if (email) user.email = email;
    if (name) user.name = name;
    if (role && ['recruiter', 'job-seeker', 'admin'].includes(role)) {
      user.role = role;
    }
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');

    return NextResponse.json(
      { message: 'User updated successfully', user: updatedUser },
      { status: 200 }
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

// DELETE - Delete a user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireRole(request, ['admin']);
    await connectDB();
    const { id } = await params;

    const user = await User.findById(id);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Count associated data for audit log
    let jobsCount = 0;
    let cvsCount = 0;
    if (user.role === 'recruiter') {
      jobsCount = await Job.countDocuments({ recruiter: user._id });
    } else if (user.role === 'job-seeker') {
      cvsCount = await CV.countDocuments({ jobSeeker: user._id });
    }

    // Store user data for audit log before deletion
    const userData = {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      jobsCount,
      cvsCount,
    };

    // Delete associated data
    if (user.role === 'recruiter') {
      await Job.deleteMany({ recruiter: user._id });
    } else if (user.role === 'job-seeker') {
      await CV.deleteMany({ jobSeeker: user._id });
    }

    await User.findByIdAndDelete(id);

    // Create audit log
    await createDeleteAuditLog(request, {
      entityType: 'user',
      entityId: id,
      userId: adminUser.userId,
      before: userData,
      reason: `Deleted ${user.role} user "${user.name}" (${user.email})${jobsCount > 0 ? ` and ${jobsCount} job(s)` : ''}${cvsCount > 0 ? ` and ${cvsCount} CV(s)` : ''}`,
      metadata: { jobsDeleted: jobsCount, cvsDeleted: cvsCount },
    });

    return NextResponse.json(
      { message: 'User deleted successfully' },
      { status: 200 }
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

