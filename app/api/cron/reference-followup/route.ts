import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/cronAuth';
import { processReferenceFollowups } from '@/lib/talentNetwork/referenceFollowup';

/**
 * Vercel Cron: reference no-response follow-up (remind + expire).
 * Schedule: daily at 10:00 UTC (vercel.json).
 */
export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processReferenceFollowups();
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cron/reference-followup]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
