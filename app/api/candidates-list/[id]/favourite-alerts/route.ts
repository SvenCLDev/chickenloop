import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { requireRole } from '@/lib/auth';

/**
 * PATCH favourite availability alert preferences for a CV.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, ['recruiter', 'admin']);
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const userData = await User.findById(user.userId);
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isFavourite = (userData.favouriteCandidates || []).some(
      (favId) => favId.toString() === id
    );
    if (!isFavourite) {
      return NextResponse.json(
        { error: 'Candidate is not in your favourites' },
        { status: 400 }
      );
    }

    if (!userData.favouriteTalentAlertPrefs) {
      userData.favouriteTalentAlertPrefs = [];
    }

    let prefs = userData.favouriteTalentAlertPrefs.find(
      (p) => p.cvId.toString() === id
    );
    if (!prefs) {
      prefs = {
        cvId: id as unknown as typeof userData.favouriteTalentAlertPrefs[0]['cvId'],
        notifyWhenAvailableNow: true,
        notifyWhenAvailableSoon: false,
      };
      userData.favouriteTalentAlertPrefs.push(prefs);
    }

    if (typeof body.notifyWhenAvailableNow === 'boolean') {
      prefs.notifyWhenAvailableNow = body.notifyWhenAvailableNow;
    }
    if (typeof body.notifyWhenAvailableSoon === 'boolean') {
      prefs.notifyWhenAvailableSoon = body.notifyWhenAvailableSoon;
    }

    await userData.save();

    return NextResponse.json({
      alertPrefs: {
        notifyWhenAvailableNow: prefs.notifyWhenAvailableNow !== false,
        notifyWhenAvailableSoon: prefs.notifyWhenAvailableSoon === true,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'Forbidden' || errorMessage === 'COMPANY_PROFILE_INCOMPLETE') {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
