import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getCacheHeaders } from '@/lib/cache';
import { getHomepageFeaturedTalent } from '@/lib/homepageFeaturedTalent';

/**
 * GET /api/homepage/featured-talent
 * Ranked Featured Talent cards for the homepage (recruiter/admin only).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['recruiter', 'admin']);
    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get('limit') || '6');
    const limit = Number.isFinite(limitParam) ? limitParam : 6;
    const includeDebug =
      user.role === 'admin' && searchParams.get('debug') === '1';
    const bypassCache = searchParams.get('refresh') === '1' && user.role === 'admin';

    const { cards, debug } = await getHomepageFeaturedTalent(limit, {
      bypassCache,
      includeDebug,
    });

    const body: { cvs: typeof cards; debug?: typeof debug } = { cvs: cards };
    if (includeDebug && debug) {
      body.debug = debug;
    }

    return NextResponse.json(body, {
      status: 200,
      headers: {
        // Private: recruiter/admin only. Short browser cache; server memo is ~24h.
        ...getCacheHeaders({ maxAge: 300, scope: 'private', swr: 60 }),
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (errorMessage === 'PASSWORD_RESET_REQUIRED') {
      return NextResponse.json({ error: 'PASSWORD_RESET_REQUIRED' }, { status: 403 });
    }
    console.error('[homepage featured-talent] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load featured talent' },
      { status: 500 }
    );
  }
}
