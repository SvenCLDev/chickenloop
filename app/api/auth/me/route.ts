import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyAuthIncludingNextAuth } from '@/lib/auth';
import { authOptions } from '@/lib/nextAuth';
import { isEmailBlocked } from '@/lib/blockedEmail';

/** Mongoose requires Node; keeps behavior consistent with NextAuth on Vercel. */
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    /**
     * Prefer getServerSession — same cookie path as /api/auth/session.
     * getToken({ req: NextRequest }) can return null on some deployments even when the
     * session cookie is valid, which caused 401 on /api/auth/me while session worked.
     */
    const session = await getServerSession(authOptions);
    const su = session?.user as { id?: string; email?: string | null; name?: string | null; role?: string | null } | undefined;

    if (su && (su.id || su.email)) {
      await connectDB();
      const emailNorm = typeof su.email === 'string' ? su.email.trim().toLowerCase() : '';

      let userData =
        su.id && /^[a-fA-F0-9]{24}$/.test(su.id)
          ? await User.findById(su.id).select('-password')
          : null;
      if (!userData && emailNorm) {
        userData = await User.findOne({ email: emailNorm }).select('-password');
      }

      if (userData) {
        if (await isEmailBlocked(userData.email)) {
          return NextResponse.json(
            { error: 'ACCOUNT_BLOCKED', message: 'This account has been blocked.' },
            { status: 403 }
          );
        }
        return NextResponse.json({
          user: {
            id: userData._id,
            email: userData.email,
            name: userData.name,
            role: userData.role,
          },
        });
      }

      if (su.id && emailNorm) {
        return NextResponse.json({
          user: {
            id: su.id,
            email: emailNorm,
            name: su.name ?? '',
            role: su.role ?? null,
          },
        });
      }
    }

    const user = await verifyAuthIncludingNextAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const userData = await User.findById(user.userId).select('-password');

    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (await isEmailBlocked(userData.email)) {
      return NextResponse.json(
        { error: 'ACCOUNT_BLOCKED', message: 'This account has been blocked.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      user: {
        id: userData._id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}
