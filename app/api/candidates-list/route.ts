import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthIncludingNextAuth } from '@/lib/auth';
import { loadCVs } from '@/lib/loadCVs';
import { parseCandidateSearchParams } from '@/lib/candidateSearchParams';
import {
  listEventForPage,
  logTalentSearchEvent,
} from '@/lib/talentSearchAnalytics';
import { resolveTalentViewerTier } from '@/lib/talentVisibility';

/**
 * GET /api/candidates-list
 * Public directory for anonymous + job seekers (tiered PII).
 * Full payload for recruiters/admins. Analytics only for recruiters/admins.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthIncludingNextAuth(request);
    const viewerTier = resolveTalentViewerTier(user);

    const { searchParams } = new URL(request.url);
    const filters = parseCandidateSearchParams(searchParams);

    const result = await loadCVs({ searchParams, viewerTier });

    if (user && (user.role === 'recruiter' || user.role === 'admin')) {
      void logTalentSearchEvent({
        event: listEventForPage(result.pagination.page),
        recruiterId: user.userId,
        role: user.role,
        filters,
        resultCount: result.pagination.total,
      });
    }

    return NextResponse.json(
      {
        cvs: result.cvs,
        filters: result.filters,
        pagination: result.pagination,
        viewerTier,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API: /api/candidates-list - Error:', error);
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
