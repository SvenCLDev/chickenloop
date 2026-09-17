import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { handleReferenceEmailBounce } from '@/lib/talentNetwork/handleReferenceEmailBounce';

export const runtime = 'nodejs';

const HANDLED_TYPES = new Set(['email.bounced', 'email.failed']);

type ResendWebhookPayload = {
  type?: string;
  data?: {
    email_id?: string;
    bounce?: { type?: string; message?: string };
    /** Some payloads nest failure info differently */
    [key: string]: unknown;
  };
};

// #region agent log
function debugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>
) {
  const payload = {
    sessionId: '85d025',
    runId: 'pre-fix',
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  console.log('[webhooks/resend][debug]', JSON.stringify(payload));
  fetch('http://127.0.0.1:7714/ingest/809469dc-4731-4443-a5ec-6d4761840282', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '85d025',
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
// #endregion

/**
 * POST /api/webhooks/resend
 * Resend (Svix) webhook for delivery events. Correlates reference bounces to CV experience.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    // #region agent log
    debugLog('A', 'webhooks/resend/route.ts:secret', 'RESEND_WEBHOOK_SECRET missing', {
      hasSecret: false,
    });
    // #endregion
    console.error('[webhooks/resend] RESEND_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const payload = await request.text();
  const svixId = request.headers.get('svix-id');
  const svixTimestamp = request.headers.get('svix-timestamp');
  const svixSignature = request.headers.get('svix-signature');

  // #region agent log
  debugLog('A', 'webhooks/resend/route.ts:entry', 'Webhook POST received', {
    hasSecret: true,
    secretPrefix: secret.slice(0, 5),
    hasSvixId: Boolean(svixId),
    hasSvixTimestamp: Boolean(svixTimestamp),
    hasSvixSignature: Boolean(svixSignature),
    payloadBytes: payload.length,
  });
  // #endregion

  if (!svixId || !svixTimestamp || !svixSignature) {
    // #region agent log
    debugLog('A', 'webhooks/resend/route.ts:headers', 'Missing Svix headers', {});
    // #endregion
    return NextResponse.json({ error: 'Missing Svix signature headers' }, { status: 400 });
  }

  // Svix v2 verify() only validates the signature and returns undefined —
  // the caller must JSON.parse the raw body (v1 used to return the parsed object).
  try {
    const wh = new Webhook(secret);
    wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
  } catch (err) {
    // #region agent log
    debugLog('B', 'webhooks/resend/route.ts:verify', 'Signature verification failed', {
      errName: err instanceof Error ? err.name : 'unknown',
    });
    // #endregion
    console.warn('[webhooks/resend] Invalid signature', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: ResendWebhookPayload;
  try {
    event = JSON.parse(payload) as ResendWebhookPayload;
  } catch {
    // #region agent log
    debugLog('C', 'webhooks/resend/route.ts:json', 'Payload JSON parse failed after verify', {
      payloadBytes: payload.length,
    });
    // #endregion
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  // #region agent log
  debugLog('C', 'webhooks/resend/route.ts:svix_v2', 'Parsed body after signature verify', {
    verifyReturnsUndefined: true,
    hasType: typeof event?.type === 'string',
    runId: 'post-fix',
  });
  // #endregion

  const type = event?.type;
  const dataKeys =
    event?.data && typeof event.data === 'object' ? Object.keys(event.data) : [];
  // #region agent log
  debugLog('C', 'webhooks/resend/route.ts:parsed', 'Verified webhook payload', {
    type: type ?? null,
    handled: Boolean(type && HANDLED_TYPES.has(type)),
    dataKeys,
    hasEmailId: typeof event.data?.email_id === 'string',
    emailIdLen: typeof event.data?.email_id === 'string' ? event.data.email_id.length : 0,
  });
  // #endregion

  if (!type || !HANDLED_TYPES.has(type)) {
    return NextResponse.json({ received: true, ignored: true, type: type ?? null });
  }

  const messageId =
    typeof event.data?.email_id === 'string' ? event.data.email_id : undefined;
  if (!messageId) {
    // #region agent log
    debugLog('C', 'webhooks/resend/route.ts:no_email_id', 'Bounce event missing email_id', {
      type,
      dataKeys,
    });
    // #endregion
    return NextResponse.json({ received: true, ignored: true, reason: 'no_email_id' });
  }

  const bounceType =
    type === 'email.failed'
      ? 'failed'
      : typeof event.data?.bounce === 'object' &&
          event.data.bounce &&
          typeof (event.data.bounce as { type?: string }).type === 'string'
        ? (event.data.bounce as { type: string }).type
        : 'bounced';

  try {
    const result = await handleReferenceEmailBounce({
      resendMessageId: messageId,
      bounceType,
    });

    if (!result.ok) {
      // #region agent log
      debugLog('E', 'webhooks/resend/route.ts:handler_error', 'Bounce handler returned error', {
        error: result.error,
      });
      // #endregion
      console.error('[webhooks/resend] bounce handler error', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // #region agent log
    debugLog('D', 'webhooks/resend/route.ts:outcome', 'Bounce handler finished', {
      outcome: result.outcome,
      bounceType,
      emailIdSuffix: messageId.slice(-8),
      runId: 'post-fix',
    });
    // #endregion

    return NextResponse.json({
      received: true,
      outcome: result.outcome,
      bounceType,
      emailIdSuffix: messageId.slice(-8),
    });
  } catch (err) {
    // #region agent log
    debugLog('E', 'webhooks/resend/route.ts:throw', 'Bounce handler threw', {
      errName: err instanceof Error ? err.name : 'unknown',
      errMessage: err instanceof Error ? err.message : String(err),
    });
    // #endregion
    console.error('[webhooks/resend] handler threw', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
