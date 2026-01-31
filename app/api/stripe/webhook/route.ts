/**
 * Stripe webhook handler for checkout.session.completed.
 *
 * For job boost: read jobId and boostDurationDays from session.metadata only.
 * Do NOT infer duration from product or price. Apply featuredUntil to the job and save.
 */
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeSecretKey, getStripeWebhookSecret } from '@/lib/env';
import connectDB from '@/lib/db';
import StripeEvent from '@/models/StripeEvent';
import Job from '@/models/Job';

/** Convert boostDurationDays from session metadata (string) to number. Returns null if invalid. */
function parseBoostDurationDays(value: string | null | undefined): number | null {
  if (value == null || String(value).trim() === '') return null;
  const n = parseInt(String(value).trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

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
  } catch (err) {
    console.error('[Stripe webhook] Failed to read raw body', err);
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
    console.warn('[Stripe webhook] Signature verification failed', { message, err });
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

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const sessionMetadata = (session.metadata ?? {}) as Record<string, string>;

  // Only handle job boost: read jobId and boostDurationDays from metadata only.
  if (sessionMetadata.type !== 'job_boost') {
    await acknowledgeEvent(event.id);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const jobId = sessionMetadata.jobId?.trim() ?? null;
  const boostDurationDays = parseBoostDurationDays(sessionMetadata.boostDurationDays ?? null);

  if (!jobId || boostDurationDays == null) {
    console.warn(
      '[Stripe webhook] checkout.session.completed job_boost missing jobId or invalid boostDurationDays. Skipping.',
      { sessionId, eventId: event.id, jobId, boostDurationDays: sessionMetadata.boostDurationDays }
    );
    await acknowledgeEvent(event.id);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  try {
    await connectDB();
  } catch (err) {
    console.error('[Stripe webhook] DB connect failed', err);
    return NextResponse.json(
      { error: 'Database error' },
      { status: 500 }
    );
  }

  const job = await Job.findById(jobId).lean();
  if (!job) {
    console.warn('[Stripe webhook] job not found', { jobId });
    await acknowledgeEvent(event.id);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const now = new Date();
  const existingFeaturedUntil =
    job.featuredUntil instanceof Date
      ? job.featuredUntil
      : job.featuredUntil != null
        ? new Date(job.featuredUntil)
        : null;

  const msPerDay = 24 * 60 * 60 * 1000;
  const durationMs = boostDurationDays * msPerDay;

  // If job.featuredUntil exists and is in the future: new = existing + duration. Else: new = now + duration.
  const baseTime =
    existingFeaturedUntil && existingFeaturedUntil > now
      ? existingFeaturedUntil.getTime()
      : now.getTime();
  const newFeaturedUntil = new Date(baseTime + durationMs);

  const oldFeaturedUntil = existingFeaturedUntil ?? null;

  try {
    await Job.findByIdAndUpdate(jobId, {
      $set: { featured: true, featuredUntil: newFeaturedUntil },
    });
  } catch (err) {
    console.error('[Stripe webhook] findByIdAndUpdate failed', { jobId, err });
    return NextResponse.json(
      { error: 'Failed to apply featuredUntil' },
      { status: 500 }
    );
  }

  console.log('[Stripe webhook] checkout.session.completed job boost applied', {
    oldFeaturedUntil: oldFeaturedUntil?.toISOString() ?? null,
    newFeaturedUntil: newFeaturedUntil.toISOString(),
    boostDurationDays,
  });

  await acknowledgeEvent(event.id);
  return NextResponse.json({ received: true }, { status: 200 });
}

async function acknowledgeEvent(eventId: string): Promise<void> {
  try {
    await StripeEvent.create({ eventId });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: number }).code === 11000
    ) {
      // Duplicate key: already processed; idempotent
    } else {
      throw err;
    }
  }
}
