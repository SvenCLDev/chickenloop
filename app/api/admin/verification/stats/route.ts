import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CV from '@/models/CV';
import User from '@/models/User';
import { requireRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);
    await connectDB();

    const [pendingCerts, confirmedReferences, betaUsers, verifiedCerts] =
      await Promise.all([
        CV.countDocuments({
          'verifiedCertificates.verificationStatus': 'pending_review',
        }),
        CV.countDocuments({
          'seasonalExperience.verificationStatus': 'reference_confirmed',
        }),
        User.countDocuments({ role: 'job-seeker', talentNetworkBeta: true }),
        CV.countDocuments({
          'verifiedCertificates.verificationStatus': 'verified',
        }),
      ]);

    return NextResponse.json(
      { pendingCerts, confirmedReferences, betaUsers, verifiedCerts },
      { status: 200 }
    );
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
