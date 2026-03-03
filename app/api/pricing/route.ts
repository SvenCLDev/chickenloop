/**
 * Public pricing API for the frontend. Server-only; uses lookup-key based
 * pricing from Stripe. Does not expose Stripe price IDs.
 */
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import type { PriceLookupKey } from '@/lib/stripe/prices';
import { getCachedPrices } from '@/lib/stripe/prices';

const LOOKUP_KEYS_ORDER: PriceLookupKey[] = [
  'featured_job_7',
  'featured_job_14',
  'featured_job_30',
  'featured_cv_7',
  'featured_cv_14',
  'featured_cv_30',
];

/** Derive duration_days from price metadata or lookup_key (e.g. featured_job_7 -> 7). */
function getDurationDays(price: Stripe.Price): number | null {
  const meta = price.metadata && typeof price.metadata === 'object' ? price.metadata : null;
  const fromMeta = meta?.duration_days ?? meta?.durationDays;
  if (fromMeta != null && fromMeta !== '') {
    const n = parseInt(String(fromMeta).trim(), 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const key = price.lookup_key;
  if (!key || typeof key !== 'string') return null;
  const parts = key.split('_');
  const last = parts[parts.length - 1];
  const n = parseInt(last, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Product name from expanded price.product (no price IDs exposed). */
function getProductName(price: Stripe.Price): string {
  const product = price.product;
  if (!product || typeof product !== 'object') return '';
  if ('deleted' in product && product.deleted) return '';
  return (product as Stripe.Product).name ?? '';
}

export type PricingItem = {
  lookupKey: string;
  currency: string;
  unit_amount: number | null;
  duration_days: number | null;
  productName: string;
};

export async function GET() {
  let prices: Record<PriceLookupKey, Stripe.Price>;
  try {
    prices = await getCachedPrices();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Pricing unavailable';
    return NextResponse.json(
      { error: message },
      { status: 503 }
    );
  }

  const items: PricingItem[] = LOOKUP_KEYS_ORDER.map((lookupKey) => {
    const price = prices[lookupKey];
    if (!price) {
      return {
        lookupKey,
        currency: '',
        unit_amount: null,
        duration_days: null,
        productName: '',
      };
    }
    return {
      lookupKey,
      currency: price.currency ?? '',
      unit_amount: price.unit_amount ?? null,
      duration_days: getDurationDays(price),
      productName: getProductName(price),
    };
  });

  return NextResponse.json({ prices: items }, { status: 200 });
}
