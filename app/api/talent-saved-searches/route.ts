import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import TalentSavedSearch from '@/models/TalentSavedSearch';
import { requireRole } from '@/lib/auth';
import {
  sanitizeTalentAlertFilters,
  formatTalentFilterChips,
} from '@/lib/talentAlerts/sanitizeFilters';
import { trackTalentAlertAnalytics } from '@/lib/talentAlerts/analytics';

function serializeSearch(doc: Record<string, unknown>) {
  return {
    ...doc,
    id: String(doc._id),
    filterChips: formatTalentFilterChips(
      (doc.filters || {}) as Parameters<typeof formatTalentFilterChips>[0]
    ),
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['recruiter', 'admin']);
    await connectDB();

    const searches = await TalentSavedSearch.find({ recruiterId: user.userId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      { savedSearches: searches.map((s) => serializeSearch(s as Record<string, unknown>)) },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (
      errorMessage === 'Forbidden' ||
      errorMessage === 'PASSWORD_RESET_REQUIRED' ||
      errorMessage === 'COMPANY_PROFILE_INCOMPLETE'
    ) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }
    console.error('[API /talent-saved-searches GET]', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['recruiter', 'admin']);
    await connectDB();

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const frequency = body.frequency || 'daily';
    if (!['immediate', 'daily', 'weekly', 'never'].includes(frequency)) {
      return NextResponse.json(
        { error: 'Frequency must be immediate, daily, weekly, or never' },
        { status: 400 }
      );
    }

    const filters = sanitizeTalentAlertFilters(body.filters);
    if (!filters) {
      return NextResponse.json(
        { error: 'At least one filter must be provided' },
        { status: 400 }
      );
    }

    const now = new Date();
    const savedSearch = await TalentSavedSearch.create({
      recruiterId: user.userId,
      name,
      filters,
      frequency,
      active: body.active !== false,
      baselineAt: now,
    });

    trackTalentAlertAnalytics('talent_search_saved', {
      recruiterId: user.userId,
      searchId: String(savedSearch._id),
      frequency,
    });

    return NextResponse.json(
      {
        message: 'Talent search saved successfully',
        savedSearch: serializeSearch(savedSearch.toObject() as Record<string, unknown>),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (
      errorMessage === 'Forbidden' ||
      errorMessage === 'PASSWORD_RESET_REQUIRED' ||
      errorMessage === 'COMPANY_PROFILE_INCOMPLETE'
    ) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }
    console.error('[API /talent-saved-searches POST]', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
