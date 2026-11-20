import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/cronAuth';
import { processTalentAlertDigests } from '@/lib/talentAlerts/processTalentAlertEvents';

export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processTalentAlertDigests();
    console.log('[cron/talent-alerts]', result);
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (error: unknown) {
    console.error('[cron/talent-alerts]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron failed' },
      { status: 500 }
    );
  }
}
