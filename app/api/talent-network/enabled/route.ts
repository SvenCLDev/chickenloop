import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { requireRole } from '@/lib/auth';
import { getTalentNetworkAccess } from '@/lib/talentNetwork/featureFlag';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireRole(request, ['job-seeker', 'admin', 'recruiter']);
    await connectDB();

    const userDoc = await User.findById(authUser.userId)
      .select('role talentNetworkBeta')
      .lean();

    const access = getTalentNetworkAccess({
      role: userDoc?.role ?? authUser.role,
      talentNetworkBeta: userDoc?.talentNetworkBeta === true,
    });

    return NextResponse.json(access, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
