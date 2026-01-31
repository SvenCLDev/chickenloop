import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeSecretKey } from '@/lib/env';
import type { PriceLookupKey } from '@/lib/stripe/prices';
import { getCachedPrices } from '@/lib/stripe/prices';

const PRODUCT_KEY_TO_LOOKUP_KEY: Record<string, PriceLookupKey> = {
  FEATURED_JOB_7_DAYS: 'featured_job_7',
  FEATURED_JOB_14_DAYS: 'featured_job_14',
  FEATURED_JOB_30_DAYS: 'featured_job_30',
  FEATURED_CV_7_DAYS: 'featured_cv_7',
  FEATURED_CV_14_DAYS: 'featured_cv_14',
  FEATURED_CV_30_DAYS: 'featured_cv_30',
};

const VALID_PRODUCT_KEYS = Object.keys(PRODUCT_KEY_TO_LOOKUP_KEY).join(', ');

const TARGET_TYPES = ['job', 'cv'] as const;
type TargetType = (typeof TARGET_TYPES)[number];

function isTargetType(s: unknown): s is TargetType {
  return typeof s === 'string' && TARGET_TYPES.includes(s as TargetType);
}

/** Derive duration days from Stripe price metadata (e.g. duration_days or durationDays). */
function getDurationDaysFromPrice(price: Stripe.Price): string | undefined {
  const raw =
    (price.metadata && typeof price.metadata === 'object' && (price.metadata.duration_days ?? price.metadata.durationDays)) ??
    undefined;
  if (raw === undefined || raw === null) return undefined;
  const s = String(raw).trim();
  return s === '' ? undefined : s;
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

  const { productKey, entityType, entityId } = body as {
    productKey?: unknown;
    entityType?: unknown;
    entityId?: unknown;
  };

  if (typeof productKey !== 'string' || !productKey.trim()) {
    return NextResponse.json(
      { error: 'productKey is required and must be a non-empty string' },
      { status: 400 }
    );
  }

  const trimmedKey = productKey.trim();
  const lookupKey = PRODUCT_KEY_TO_LOOKUP_KEY[trimmedKey];
  if (!lookupKey) {
    return NextResponse.json(
      {
        error: `Unknown productKey: "${productKey}". Valid keys: ${VALID_PRODUCT_KEYS}`,
      },
      { status: 400 }
    );
  }

  let price: Stripe.Price;
  try {
    const prices = await getCachedPrices();
    const p = prices[lookupKey];
    if (p == null || p.id == null) {
      throw new Error(
        `Stripe price missing for lookup_key: "${lookupKey}". Create an active price with this lookup_key in the Stripe Dashboard.`
      );
    }
    if (p.active === false) {
      throw new Error(
        `Stripe price is inactive for lookup_key: "${lookupKey}". Activate the price in the Stripe Dashboard or create a new active price with this lookup_key.`
      );
    }
    price = p;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to resolve price';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!isTargetType(entityType)) {
    return NextResponse.json(
      { error: 'entityType must be "job" or "cv"' },
      { status: 400 }
    );
  }
  if (typeof entityId !== 'string' || !entityId.trim()) {
    return NextResponse.json(
      { error: 'entityId is required and must be a non-empty string' },
      { status: 400 }
    );
  }

  const targetId = entityId.trim();
  const targetType: TargetType = entityType;
  const durationDays = getDurationDaysFromPrice(price);
  const sessionMetadata: Record<string, string> = {
    lookupKey,
    targetType,
    targetId,
  };
  if (durationDays !== undefined) {
    sessionMetadata.durationDays = durationDays;
  }

  // Use request Origin so Stripe redirects back to same host (staging vs production)
  const baseUrl = getBaseUrlFromRequest(request);
  const stripe = new Stripe(secretKey);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      metadata: sessionMetadata,
      // Safe return page only — no job create/edit or dashboard forms
      success_url: `${baseUrl}/stripe/return?checkout=success`,
      cancel_url: `${baseUrl}/stripe/return?checkout=cancel`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stripe error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
