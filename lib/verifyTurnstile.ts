/**
 * Server-only: verify Cloudflare Turnstile token with Siteverify API.
 * Use in API routes before processing contact form or other protected actions.
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileVerifyResult {
  success: boolean;
  /** Error codes from Cloudflare when success is false */
  'error-codes'?: string[];
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteip?: string | null
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    console.warn('TURNSTILE_SECRET_KEY is not set. Turnstile verification disabled.');
    return { success: false, 'error-codes': ['missing-secret'] };
  }

  if (!token || typeof token !== 'string' || token.length === 0) {
    return { success: false, 'error-codes': ['missing-input-response'] };
  }

  try {
    const body: { secret: string; response: string; remoteip?: string } = {
      secret,
      response: token,
    };
    if (remoteip) body.remoteip = remoteip;

    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as TurnstileVerifyResult;
    return data;
  } catch (err) {
    console.error('Turnstile siteverify error:', err instanceof Error ? err.message : 'Unknown error');
    return { success: false, 'error-codes': ['internal-error'] };
  }
}
