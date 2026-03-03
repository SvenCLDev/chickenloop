import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeSecretKey } from '@/lib/env';

const JOB_BOOST_LOOKUP_KEYS = ['featured_job_7', 'featured_job_14', 'featured_job_30'] as const;

export interface JobBoostPriceItem {
  lookupKey: string;
  durationDays: number;
  priceId: string;
  amount: number;
  currency: string;
  formattedPrice: string;
  productName: string;
}

/** Parse duration days from lookup_key (e.g. featured_job_7 -> 7). */
function durationDaysFromLookupKey(lookupKey: string): number {
  const parts = lookupKey.split('_');
  const last = parts[parts.length - 1];
  const n = parseInt(last, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Format amount in currency using Intl.NumberFormat. */
function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

export async function GET() {
  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 503 }
    );
  }

  const stripe = new Stripe(secretKey);

  try {
    const response = await stripe.prices.list({
      active: true,
      lookup_keys: [...JOB_BOOST_LOOKUP_KEYS],
      expand: ['data.product'],
    });

    const byLookupKey = new Map<string, Stripe.Price>();
    for (const price of response.data) {
      if (price.lookup_key) {
        byLookupKey.set(price.lookup_key, price);
      }
    }

    const missing = JOB_BOOST_LOOKUP_KEYS.filter((key) => !byLookupKey.has(key));
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `Stripe price(s) missing or inactive for lookup_key(s): ${missing.join(', ')}`,
        },
        { status: 502 }
      );
    }

    const items: JobBoostPriceItem[] = JOB_BOOST_LOOKUP_KEYS.map((lookupKey) => {
      const price = byLookupKey.get(lookupKey)!;
      const product = price.product;
      const productName =
        typeof product === 'object' && product !== null && 'name' in product
          ? String((product as Stripe.Product).name ?? '')
          : '';
      const unitAmount = price.unit_amount ?? 0;
      const amount = unitAmount / 100;
      const currency = price.currency ?? 'usd';
      const durationDays = durationDaysFromLookupKey(lookupKey);

      return {
        lookupKey,
        durationDays,
        priceId: price.id,
        amount,
        currency,
        formattedPrice: formatPrice(amount, currency),
        productName,
      };
    });

    items.sort((a, b) => a.durationDays - b.durationDays);

    return NextResponse.json(items);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch prices';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
