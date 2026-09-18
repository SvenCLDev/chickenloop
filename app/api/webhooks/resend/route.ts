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

/**
 * POST /api/webhooks/resend
 * Resend (Svix) webhook for delivery events. Correlates reference bounces to CV experience.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error('[webhooks/resend] RESEND_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const payload = await request.text();
  const svixId = request.headers.get('svix-id');
  const svixTimestamp = request.headers.get('svix-timestamp');
  const svixSignature = request.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
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
    console.warn('[webhooks/resend] Invalid signature', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: ResendWebhookPayload;
  try {
    event = JSON.parse(payload) as ResendWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const type = event?.type;
  if (!type || !HANDLED_TYPES.has(type)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const messageId =
    typeof event.data?.email_id === 'string' ? event.data.email_id : undefined;
  if (!messageId) {
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
      console.error('[webhooks/resend] bounce handler error', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ received: true, outcome: result.outcome });
  } catch (err) {
    console.error('[webhooks/resend] handler threw', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
