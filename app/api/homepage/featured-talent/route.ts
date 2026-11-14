import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthIncludingNextAuth } from '@/lib/auth';
import { getCacheHeaders } from '@/lib/cache';
import { getHomepageFeaturedTalent } from '@/lib/homepageFeaturedTalent';
import {
  applyHomepageFeaturedTalentVisibility,
  resolveTalentViewerTier,
} from '@/lib/talentVisibility';

/**
 * GET /api/homepage/featured-talent
 * Ranked Featured Talent cards for the homepage (public).
 * Anonymous viewers receive cards with fullName redacted.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthIncludingNextAuth(request);
    const viewerTier = resolveTalentViewerTier(user);
    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get('limit') || '6');
    const limit = Number.isFinite(limitParam) ? limitParam : 6;
    const isAdmin = user?.role === 'admin';
    const includeDebug = isAdmin && searchParams.get('debug') === '1';
    const bypassCache = searchParams.get('refresh') === '1' && isAdmin;

    const { cards, debug } = await getHomepageFeaturedTalent(limit, {
      bypassCache,
      includeDebug,
    });

    const visibleCards = cards.map((card) =>
      applyHomepageFeaturedTalentVisibility(card, viewerTier)
    );

    const body: { cvs: typeof visibleCards; debug?: typeof debug } = {
      cvs: visibleCards,
    };
    if (includeDebug && debug) {
      body.debug = debug;
    }

    return NextResponse.json(body, {
      status: 200,
      headers: {
        // Private: payload differs by auth tier. Server selection memo is ~24h.
        ...getCacheHeaders({ maxAge: 300, scope: 'private', swr: 60 }),
      },
    });
  } catch (error: unknown) {
    console.error('[homepage featured-talent] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load featured talent' },
      { status: 500 }
    );
  }
}
