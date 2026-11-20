import { NextRequest, NextResponse } from 'next/server';
import { handleTalentAlertInternalAction } from '@/lib/talentAlerts/processTalentAlertEvents';

/**
 * Internal endpoint for enqueueing / processing Talent Alert events.
 * Authenticated via INTERNAL_API_SECRET or CRON_SECRET bearer token.
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET;
    if (secret) {
      const auth = request.headers.get('authorization') || '';
      if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json().catch(() => ({}));
    const result = await handleTalentAlertInternalAction(body || {});
    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (error: unknown) {
    console.error('[internal/process-talent-alert-events]', error);
    // Return 200 to avoid retries flooding
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'error' },
      { status: 200 }
    );
  }
}
