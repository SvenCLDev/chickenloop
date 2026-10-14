import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getReferenceFunnelStats } from '@/lib/talentNetwork/referenceMetrics';

/**
 * GET /api/admin/reference-metrics
 * Funnel snapshot for reviewing reference response rates before changing cadence.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);
    const stats = await getReferenceFunnelStats();
    return NextResponse.json({
      stats,
      timingNotes: {
        expiryDays: 21,
        autoRemindAfterDays: 5,
        maxReminders: 1,
        secondRemindProposedDays: 10,
        revisitWhen:
          'Compare pending vs confirmed and medianHoursToResponse after Phase 1–3 changes before raising max reminders.',
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
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}
