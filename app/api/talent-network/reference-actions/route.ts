import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import {
  runReferenceAction,
  type ReferenceAction,
} from '@/lib/talentNetwork/referenceFollowup';

const ACTIONS = new Set<ReferenceAction>(['remind', 'cancel', 'resend']);

/**
 * POST /api/talent-network/reference-actions
 * Body: { experienceEntryId: string, action: 'remind' | 'cancel' | 'resend' }
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireRole(request, ['job-seeker', 'admin']);
    const body = await request.json().catch(() => ({}));
    const experienceEntryId =
      typeof body.experienceEntryId === 'string' ? body.experienceEntryId.trim() : '';
    const action = body.action as ReferenceAction;

    if (!experienceEntryId || !ACTIONS.has(action)) {
      return NextResponse.json(
        { error: 'experienceEntryId and a valid action are required' },
        { status: 400 }
      );
    }

    // Admins acting on behalf of a seeker still need the CV owner id — for now
    // only the owning job seeker can mutate their own references.
    if (authUser.role !== 'job-seeker') {
      return NextResponse.json(
        { error: 'Only job seekers can manage reference requests' },
        { status: 403 }
      );
    }

    const result = await runReferenceAction({
      userId: authUser.userId,
      experienceEntryId,
      action,
    });

    if (!result.ok) {
      const status =
        result.code === 'not_found'
          ? 404
          : result.code === 'invalid_state' ||
              result.code === 'too_soon' ||
              result.code === 'already_reminded' ||
              result.code === 'missing_email'
            ? 400
            : 400;
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status }
      );
    }

    return NextResponse.json(result);
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
