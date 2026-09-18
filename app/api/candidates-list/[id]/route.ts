import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CV from '@/models/CV';
import { verifyAuthIncludingNextAuth } from '@/lib/auth';
import { logTalentSearchEvent } from '@/lib/talentSearchAnalytics';
import {
  applyTalentDetailVisibility,
  resolveTalentViewerTier,
} from '@/lib/talentVisibility';

/**
 * GET /api/candidates-list/[id]
 * - recruiter/admin: full CV + contacts
 * - job-seeker: professional CV without contacts (published only)
 * - anonymous: locked payload (signup CTA); no CV body
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuthIncludingNextAuth(request);
    const viewerTier = resolveTalentViewerTier(user);
    await connectDB();

    const { id } = await params;

    if (viewerTier === 'anonymous') {
      const exists = await CV.exists({ _id: id, published: { $ne: false } });
      if (!exists) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }
      return NextResponse.json(
        {
          locked: true,
          viewerTier,
          message:
            'Create a free Chickenloop profile to browse Talent Network profiles and see how instructors appear to recruiters.',
        },
        { status: 200 }
      );
    }

    const query: Record<string, unknown> = { _id: id };
    if (viewerTier !== 'recruiter') {
      query.published = { $ne: false };
    }

    const cv = await CV.findOne(query).populate('jobSeeker', 'name email lastOnline');

    if (!cv) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (user && (user.role === 'recruiter' || user.role === 'admin')) {
      void logTalentSearchEvent({
        event: 'talent_profile_view',
        recruiterId: user.userId,
        role: user.role,
        candidateId: String(cv._id),
      });
    }

    const payload = applyTalentDetailVisibility(
      cv.toObject({ virtuals: true }) as unknown as Record<string, unknown>,
      viewerTier
    );

    return NextResponse.json({ cv: payload, viewerTier }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'PASSWORD_RESET_REQUIRED') {
      return NextResponse.json({ error: 'PASSWORD_RESET_REQUIRED' }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'COMPANY_PROFILE_INCOMPLETE') {
      return NextResponse.json(
        { error: 'COMPANY_PROFILE_INCOMPLETE' },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}
