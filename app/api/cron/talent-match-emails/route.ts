import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/cronAuth';
import { processTalentMatchEmails } from '@/lib/email/processTalentMatchEmails';

/**
 * Vercel Cron: recruiter talent-match emails for jobs due ~2 days after publish/edit.
 * Schedule: daily at 11:00 UTC (vercel.json).
 */
export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processTalentMatchEmails();
    console.log('[cron/talent-match-emails]', result);
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cron/talent-match-emails] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
