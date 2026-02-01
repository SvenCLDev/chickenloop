import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  getStripeSecretKey,
  getCvBoostPriceId,
  CV_BOOST_DURATIONS,
  type CvBoostDuration,
} from '@/lib/env';

const JOB_BOOST_LOOKUP_KEYS = ['featured_job_7', 'featured_job_14', 'featured_job_30'] as const;
type JobBoostLookupKey = (typeof JOB_BOOST_LOOKUP_KEYS)[number];

function isJobBoostLookupKey(value: unknown): value is JobBoostLookupKey {
  return typeof value === 'string' && (JOB_BOOST_LOOKUP_KEYS as readonly string[]).includes(value);
}

function isCvBoostDuration(value: unknown): value is CvBoostDuration {
  return typeof value === 'number' && (CV_BOOST_DURATIONS as readonly number[]).includes(value);
}

/** Parse duration days from lookup_key (e.g. featured_job_7 -> 7). */
function durationDaysFromLookupKey(lookupKey: string): number {
  const parts = lookupKey.split('_');
  const last = parts[parts.length - 1];
  const n = parseInt(last, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Fallback base URL when Origin header is missing (e.g. server-to-server). */
function getFallbackBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  );
}

/** Base URL for redirects: prefer request Origin (staging vs production), else fallback. */
function getBaseUrlFromRequest(request: NextRequest): string {
  const origin = request.headers.get('origin')?.trim();
  if (origin && (origin.startsWith('https://') || origin.startsWith('http://'))) {
    return origin.replace(/\/$/, '');
  }
  return getFallbackBaseUrl();
}

export async function POST(request: NextRequest) {
  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { error: 'Body must be an object' },
      { status: 400 }
    );
  }

  const { targetType, targetId, lookupKey, durationDays } = body as {
    targetType?: unknown;
    targetId?: unknown;
    lookupKey?: unknown;
    durationDays?: unknown;
  };

  if (targetType !== 'job' && targetType !== 'cv') {
    return NextResponse.json(
      { error: 'targetType must be "job" or "cv"' },
      { status: 400 }
    );
  }

  if (typeof targetId !== 'string' || !targetId.trim()) {
    return NextResponse.json(
      { error: 'targetId is required and must be a non-empty string' },
      { status: 400 }
    );
  }

  const baseUrl = getBaseUrlFromRequest(request);
  const stripe = new Stripe(secretKey);

  let priceId: string;
  let boostDurationDays: number;
  let metadata: { type: string; [k: string]: string };

  if (targetType === 'job') {
    if (!isJobBoostLookupKey(lookupKey)) {
      return NextResponse.json(
        { error: `lookupKey must be one of: ${JOB_BOOST_LOOKUP_KEYS.join(', ')}` },
        { status: 400 }
      );
    }
    try {
      const response = await stripe.prices.list({
        active: true,
        lookup_keys: [lookupKey],
      });
      const price = response.data[0];
      if (!price?.id) {
        return NextResponse.json(
          { error: `Stripe price not found for lookup_key: ${lookupKey}` },
          { status: 502 }
        );
      }
      priceId = price.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resolve price';
      return NextResponse.json({ error: message }, { status: 500 });
    }
    boostDurationDays = durationDaysFromLookupKey(lookupKey);
    metadata = {
      jobId: targetId.trim(),
      boostDurationDays: String(boostDurationDays),
      type: 'job_boost',
    };
  } else {
    if (!isCvBoostDuration(durationDays)) {
      return NextResponse.json(
        { error: `durationDays must be one of: ${CV_BOOST_DURATIONS.join(', ')}` },
        { status: 400 }
      );
    }
    const cvPriceId = getCvBoostPriceId(durationDays);
    if (!cvPriceId) {
      return NextResponse.json(
        {
          error: `Stripe price not configured for CV boost (${durationDays} days). Set STRIPE_CV_BOOST_${durationDays}_PRICE_ID in your environment.`,
        },
        { status: 502 }
      );
    }
    priceId = cvPriceId;
    boostDurationDays = durationDays;
    metadata = {
      cvId: targetId.trim(),
      boostDurationDays: String(boostDurationDays),
      type: 'cv_boost',
    };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata,
      success_url: `${baseUrl}/stripe/return?checkout=success`,
      cancel_url: `${baseUrl}/stripe/return?checkout=cancel`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ checkoutUrl: session.url }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stripe error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
