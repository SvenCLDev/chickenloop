import type { NextRequest } from 'next/server';

const VERCEL_CRON_USER_AGENT = 'vercel-cron/1.0';

/**
 * Verify Vercel Cron (or manual curl) authorization.
 *
 * When CRON_SECRET is set in Vercel, invocations include:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * When CRON_SECRET is not set, only requests from Vercel Cron (user-agent) are allowed.
 * Set CRON_SECRET in Production and redeploy for stricter protection.
 */
export function verifyCronRequest(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get('authorization')?.trim();

  if (cronSecret) {
    if (!authHeader?.startsWith('Bearer ')) {
      return false;
    }
    const token = authHeader.slice('Bearer '.length).trim();
    return token === cronSecret;
  }

  return request.headers.get('user-agent') === VERCEL_CRON_USER_AGENT;
}
