import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const BCRYPT_ROUNDS = 10;

interface ResetTokenPayload {
  userId: string;
  email?: string;
  purpose?: string;
}

function verifyResetToken(token: string): ResetTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as ResetTokenPayload;
    if (!decoded || !decoded.userId || decoded.purpose !== 'password_reset') return null;
    return decoded;
  } catch {
    return null;
  }
}

// POST - Reset password using token from forgot-password email
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const token = body?.token;
    const newPassword = body?.newPassword;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'INVALID_OR_EXPIRED_TOKEN' },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const payload = verifyResetToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'INVALID_OR_EXPIRED_TOKEN' },
        { status: 400 }
      );
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'INVALID_OR_EXPIRED_TOKEN' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          mustResetPassword: false,
          passwordMigrated: false,
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'INVALID_OR_EXPIRED_TOKEN' },
      { status: 400 }
    );
  }
}
