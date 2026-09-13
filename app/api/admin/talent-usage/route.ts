import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import {
  getTalentUsageStats,
  type TalentUsagePeriodDays,
} from '@/lib/talentUsageStats';

const ALLOWED_DAYS = new Set([7, 30, 90]);

/**
 * GET /api/admin/talent-usage?days=30&includeAdmin=1
 * Aggregated recruiter talent-search intensity for the admin dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);

    const { searchParams } = new URL(request.url);
    const daysRaw = Number(searchParams.get('days') || 30);
    const days = (ALLOWED_DAYS.has(daysRaw) ? daysRaw : 30) as TalentUsagePeriodDays;
    const includeAdmin =
      searchParams.get('includeAdmin') === '1' ||
      searchParams.get('includeAdmin') === 'true';

    const stats = await getTalentUsageStats({ days, includeAdmin });

    return NextResponse.json(stats, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (message === 'PASSWORD_RESET_REQUIRED') {
      return NextResponse.json({ error: 'PASSWORD_RESET_REQUIRED' }, { status: 403 });
    }
    if (message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[admin/talent-usage]', error);
    return NextResponse.json(
      { error: message || 'Internal server error' },
      { status: 500 }
    );
  }
}
