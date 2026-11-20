import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import TalentSavedSearch from '@/models/TalentSavedSearch';
import TalentAlertEvent from '@/models/TalentAlertEvent';
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

async function loadOwnedSearch(id: string, userId: string) {
  const savedSearch = await TalentSavedSearch.findById(id);
  if (!savedSearch) return { error: 'Saved search not found', status: 404 as const };
  if (savedSearch.recruiterId.toString() !== userId) {
    return { error: 'Forbidden', status: 403 as const };
  }
  return { savedSearch };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, ['recruiter', 'admin']);
    await connectDB();
    const { id } = await params;

    const loaded = await loadOwnedSearch(id, user.userId);
    if ('error' in loaded) {
      return NextResponse.json({ error: loaded.error }, { status: loaded.status });
    }
    const { savedSearch } = loaded;
    const updates = await request.json();

    if (updates.frequency !== undefined) {
      if (!['immediate', 'daily', 'weekly', 'never'].includes(updates.frequency)) {
        return NextResponse.json(
          { error: 'Frequency must be immediate, daily, weekly, or never' },
          { status: 400 }
        );
      }
      savedSearch.frequency = updates.frequency;
    }

    if (typeof updates.name === 'string') {
      const name = updates.name.trim();
      if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }
      savedSearch.name = name;
    }

    if (typeof updates.active === 'boolean') {
      savedSearch.active = updates.active;
    }

    let filtersChanged = false;
    if (updates.filters !== undefined) {
      const filters = sanitizeTalentAlertFilters(updates.filters);
      if (!filters) {
        return NextResponse.json(
          { error: 'At least one filter must be provided' },
          { status: 400 }
        );
      }
      savedSearch.filters = filters;
      savedSearch.baselineAt = new Date();
      filtersChanged = true;
    }

    await savedSearch.save();

    if (filtersChanged) {
      await TalentAlertEvent.deleteMany({
        talentSavedSearchIds: savedSearch._id,
        status: 'pending',
      });
    }

    trackTalentAlertAnalytics('talent_search_edited', {
      recruiterId: user.userId,
      searchId: id,
      filtersChanged,
    });

    return NextResponse.json({
      message: 'Talent search updated successfully',
      savedSearch: serializeSearch(
        savedSearch.toObject() as unknown as Record<string, unknown>
      ),
    });
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
    console.error('[API /talent-saved-searches/[id] PATCH]', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, ['recruiter', 'admin']);
    await connectDB();
    const { id } = await params;

    const loaded = await loadOwnedSearch(id, user.userId);
    if ('error' in loaded) {
      return NextResponse.json({ error: loaded.error }, { status: loaded.status });
    }

    await TalentAlertEvent.deleteMany({
      talentSavedSearchIds: loaded.savedSearch._id,
      status: 'pending',
    });
    await TalentSavedSearch.findByIdAndDelete(id);

    trackTalentAlertAnalytics('talent_search_deleted', {
      recruiterId: user.userId,
      searchId: id,
    });

    return NextResponse.json({ message: 'Talent search deleted successfully' });
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
    console.error('[API /talent-saved-searches/[id] DELETE]', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
