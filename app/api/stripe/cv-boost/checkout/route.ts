import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import connectDB from '@/lib/db';
import CV from '@/models/CV';
import { requireRole } from '@/lib/auth';
import { getStripeSecretKey } from '@/lib/env';

const CV_BOOST_DURATIONS = [7, 14, 30] as const;

function isCvBoostDuration(value: unknown): value is (typeof CV_BOOST_DURATIONS)[number] {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) && (CV_BOOST_DURATIONS as readonly number[]).includes(n);
}

/** Fallback base URL when Origin header is missing (same pattern as Job Boost). */
function getFallbackBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  );
}

/** Base URL for redirects: prefer request Origin, else fallback (same pattern as Job Boost). */
function getBaseUrlFromRequest(request: NextRequest): string {
  const origin = request.headers.get('origin')?.trim();
  if (origin && (origin.startsWith('https://') || origin.startsWith('http://'))) {
    return origin.replace(/\/$/, '');
  }
  return getFallbackBaseUrl();
}

/**
 * POST /api/stripe/cv-boost/checkout
 * Creates a Stripe Checkout Session for CV boosting.
 * Auth: job-seeker only. Resume must belong to the authenticated user.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['job-seeker']);
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

    const { priceId, cvId, boostDurationDays } = body as {
      priceId?: unknown;
      cvId?: unknown;
      boostDurationDays?: unknown;
    };

    if (typeof priceId !== 'string' || !priceId.trim()) {
      return NextResponse.json(
        { error: 'priceId is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (typeof cvId !== 'string' || !cvId.trim()) {
      return NextResponse.json(
        { error: 'cvId is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (boostDurationDays != null && !isCvBoostDuration(boostDurationDays)) {
      return NextResponse.json(
        { error: `boostDurationDays must be one of: ${CV_BOOST_DURATIONS.join(', ')}` },
        { status: 400 }
      );
    }

    const duration =
      boostDurationDays != null && isCvBoostDuration(boostDurationDays)
        ? Number(boostDurationDays)
        : 7;

    await connectDB();
    const cv = await CV.findById(cvId.trim()).select('jobSeeker');
    if (!cv) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      );
    }

    const ownerId = cv.jobSeeker?.toString?.() ?? String(cv.jobSeeker);
    if (ownerId !== user.userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const baseUrl = getBaseUrlFromRequest(request);
    const stripe = new Stripe(secretKey);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: priceId.trim(),
          quantity: 1,
        },
      ],
      metadata: {
        type: 'cv_boost',
        resumeId: cvId.trim(),
        boostDurationDays: String(duration),
      },
      success_url: `${baseUrl}/stripe/return?checkout=success&type=cv_boost`,
      cancel_url: `${baseUrl}/stripe/return?checkout=cancel&type=cv_boost`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ checkoutUrl: session.url }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'COMPANY_PROFILE_INCOMPLETE') {
      return NextResponse.json(
        { error: 'COMPANY_PROFILE_INCOMPLETE' },
        { status: 403 }
      );
    }
    if (message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
