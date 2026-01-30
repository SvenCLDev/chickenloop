/**
 * Stripe webhook handler for checkout.session.completed.
 *
 * Pricing is lookup-key based: we do NOT use price IDs or env vars. We resolve
 * the product from session line_items[].price.lookup_key or metadata.lookupKey,
 * and read duration_days from Stripe price metadata (or session metadata).
 * We then apply featuredUntil to the target Job, CV, or Company.
 */
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeSecretKey, getStripeWebhookSecret } from '@/lib/env';
import connectDB from '@/lib/db';
import StripeEvent from '@/models/StripeEvent';
import Job from '@/models/Job';
import CV from '@/models/CV';
import Company from '@/models/Company';

const TARGET_TYPES = ['job', 'cv', 'company'] as const;
type TargetType = (typeof TARGET_TYPES)[number];

function isTargetType(s: unknown): s is TargetType {
  return typeof s === 'string' && TARGET_TYPES.includes(s as TargetType);
}

/** Parse duration days from string (e.g. "7", "14"). Returns null if invalid. */
function parseDurationDays(value: string | null | undefined): number | null {
  if (value == null || String(value).trim() === '') return null;
  const n = parseInt(String(value).trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Derive duration days from lookup_key when not in metadata (e.g. featured_job_7 -> 7).
 * Lookup-key based pricing uses keys like featured_job_7, featured_cv_14.
 */
function durationDaysFromLookupKey(lookupKey: string | null): number | null {
  if (!lookupKey || typeof lookupKey !== 'string') return null;
  const parts = lookupKey.split('_');
  const last = parts[parts.length - 1];
  const n = parseInt(last, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Get duration_days from Stripe price metadata (duration_days or durationDays) or session metadata. */
function getDurationDays(
  priceMetadata: Record<string, string> | null,
  sessionMetadata: Record<string, string>,
  lookupKey: string | null
): number | null {
  const fromPrice =
    priceMetadata?.duration_days ?? priceMetadata?.durationDays ?? null;
  const parsed = parseDurationDays(fromPrice ?? sessionMetadata?.durationDays ?? null);
  if (parsed != null) return parsed;
  return durationDaysFromLookupKey(lookupKey);
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

  // Retrieve session with line_items and price so we can read lookup_key and price metadata.
  // Pricing is lookup-key based; we do not use price IDs or env vars.
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items', 'line_items.data.price'],
  });

  console.log('checkout.session.completed', {
    'session.id': session.id,
    'session.metadata': session.metadata,
    'session.line_items?.data': session.line_items?.data,
    'session.mode': session.mode,
    'session.payment_status': session.payment_status,
  });

  const lineItems = session.line_items?.data ?? [];
  const sessionMetadata = (session.metadata ?? {}) as Record<string, string>;

  // Resolve lookup_key from first line item price or session metadata (lookup-key based pricing).
  const firstPrice = lineItems[0]?.price;
  const priceObject =
    firstPrice && typeof firstPrice === 'object' ? firstPrice : null;
  const lookupKey =
    (priceObject?.lookup_key as string | null) ?? sessionMetadata.lookupKey ?? null;

  if (!lookupKey || typeof lookupKey !== 'string' || lookupKey.trim() === '') {
    console.warn(
      '[Stripe webhook] checkout.session.completed missing lookup_key (session.metadata and line_items[].price.lookup_key). Skipping boost.',
      { sessionId, eventId: event.id }
    );
    await acknowledgeEvent(event.id);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const targetType = sessionMetadata.targetType;
  const targetId = sessionMetadata.targetId?.trim() ?? null;

  if (!isTargetType(targetType) || !targetId) {
    console.warn(
      '[Stripe webhook] checkout.session.completed invalid targetType or targetId. Skipping boost.',
      { sessionId, eventId: event.id, targetType, targetId }
    );
    await acknowledgeEvent(event.id);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const priceMetadata =
    priceObject?.metadata && typeof priceObject.metadata === 'object'
      ? (priceObject.metadata as Record<string, string>)
      : null;
  const durationDays = getDurationDays(
    priceMetadata,
    sessionMetadata,
    lookupKey
  );

  if (durationDays == null || durationDays <= 0) {
    console.warn(
      '[Stripe webhook] checkout.session.completed could not determine duration_days from price metadata or lookup_key. Skipping boost.',
      { sessionId, eventId: event.id, lookupKey }
    );
    await acknowledgeEvent(event.id);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const durationMs = durationDays * msPerDay;

  try {
    await connectDB();
  } catch (err) {
    console.error('[Stripe webhook] DB connect failed', err);
    return NextResponse.json(
      { error: 'Database error' },
      { status: 500 }
    );
  }

  const Model = getModelForTargetType(targetType);
  if (!Model) {
    console.warn('[Stripe webhook] unknown targetType', { targetType });
    await acknowledgeEvent(event.id);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  let doc: { featuredUntil?: Date | null } | null = null;
  try {
    doc = await Model.findById(targetId).lean();
  } catch (err) {
    console.error('[Stripe webhook] findById failed', { targetType, targetId, err });
    await acknowledgeEvent(event.id);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (!doc) {
    console.warn('[Stripe webhook] target not found', { targetType, targetId });
    await acknowledgeEvent(event.id);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const now = new Date();
  const currentUntil =
    doc.featuredUntil instanceof Date
      ? doc.featuredUntil
      : doc.featuredUntil != null
        ? new Date(doc.featuredUntil)
        : null;
  const baseTime =
    currentUntil && currentUntil > now ? currentUntil.getTime() : now.getTime();
  const newFeaturedUntil = new Date(baseTime + durationMs);

  let updatedDoc: { _id?: unknown; featured?: boolean; featuredUntil?: Date | null } | null = null;
  try {
    // Set both fields explicitly; do not rely on pre-save or other derived logic
    updatedDoc = await Model.findByIdAndUpdate(
      targetId,
      { $set: { featured: true, featuredUntil: newFeaturedUntil } },
      { new: true }
    )
      .lean() as { _id?: unknown; featured?: boolean; featuredUntil?: Date | null } | null;
  } catch (err) {
    console.error('[Stripe webhook] findByIdAndUpdate failed', {
      targetType,
      targetId,
      err,
    });
    return NextResponse.json(
      { error: 'Failed to apply featuredUntil' },
      { status: 500 }
    );
  }

  if (updatedDoc) {
    console.log('[Stripe webhook] document after save', {
      _id: updatedDoc._id,
      featured: updatedDoc.featured,
      featuredUntil: updatedDoc.featuredUntil,
      full: updatedDoc,
    });
  }

  const logPayload = {
    eventId: event.id,
    lookupKey,
    targetType,
    targetId,
    durationDays,
    oldFeaturedUntil: currentUntil?.toISOString() ?? null,
    newFeaturedUntil: newFeaturedUntil.toISOString(),
  };
  console.info(
    '[Stripe webhook] checkout.session.completed applied boost',
    JSON.stringify(logPayload)
  );

  await acknowledgeEvent(event.id);
  return NextResponse.json({ received: true }, { status: 200 });
}

function getModelForTargetType(
  targetType: TargetType
): typeof Job | typeof CV | typeof Company | null {
  switch (targetType) {
    case 'job':
      return Job;
    case 'cv':
      return CV;
    case 'company':
      return Company;
    default:
      return null;
  }
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
