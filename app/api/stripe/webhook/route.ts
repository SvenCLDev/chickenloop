import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeSecretKey, getStripeWebhookSecret } from '@/lib/env';

export async function POST(request: NextRequest) {
  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { error: 'Invalid body' },
      { status: 400 }
    );
  }

  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 503 }
    );
  }

  const stripe = new Stripe(secretKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const sessionId = (event.data.object as Stripe.Checkout.Session).id;
  if (!sessionId) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items', 'line_items.data.price'],
  });

  const lineItems = session.line_items?.data ?? [];
  const sessionMetadata = (session.metadata ?? {}) as Record<string, string>;
  const targetId = sessionMetadata.targetId ?? null;

  const extracted: Array<{ type: string | null; duration_days: string | null; targetId: string | null }> = [];
  for (const item of lineItems) {
    const price = item.price;
    if (!price || typeof price === 'string') continue;
    const meta = (price.metadata ?? {}) as Record<string, string>;
    extracted.push({
      type: meta.type ?? null,
      duration_days: meta.duration_days ?? null,
      targetId,
    });
  }
  // TODO: use extracted to apply boost (e.g. set featuredUntil on Job/CV/Company by targetId)

  return NextResponse.json({ received: true }, { status: 200 });
}
