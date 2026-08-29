import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { requireRole } from '@/lib/auth';
import { TALENT_NETWORK_INTRO_CAMPAIGN_ID } from '@/lib/talentNetwork/introCampaign';

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireRole(request, ['job-seeker']);
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const campaignId =
      typeof body.campaignId === 'string' ? body.campaignId.trim() : '';

    if (campaignId !== TALENT_NETWORK_INTRO_CAMPAIGN_ID) {
      return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
    }

    await User.findByIdAndUpdate(authUser.userId, {
      $set: { talentNetworkIntroDismissedCampaign: campaignId },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
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
