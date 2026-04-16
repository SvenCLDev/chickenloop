import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getToken } from 'next-auth/jwt';

type RoleChoice = 'job_seeker' | 'recruiter';

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
    const email = typeof token?.email === 'string' ? token.email.trim().toLowerCase() : null;
    if (!token || !email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const role = body?.role as RoleChoice | undefined;
    if (role !== 'job_seeker' && role !== 'recruiter') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    await connectDB();

    // Keep backward compatibility with the existing app role values.
    const storedRole = role === 'job_seeker' ? 'job-seeker' : 'recruiter';

    const res = await User.updateOne(
      { email },
      { $set: { role: storedRole } }
    );

    if (!res.matchedCount) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        role,
        redirectTo: storedRole === 'recruiter' ? '/recruiter' : '/job-seeker',
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

