/**
 * Pricing is fetched dynamically from Stripe by lookup_key so that price IDs
 * can change (e.g. new prices with the same lookup key) without code changes.
 * Server-only: do not import into client components.
 */
import 'server-only';
import Stripe from 'stripe';
import { getStripeSecretKey } from '@/lib/env';

export type PriceLookupKey =
  | 'featured_job_7'
  | 'featured_job_14'
  | 'featured_job_30'
  | 'featured_cv_7'
  | 'featured_cv_14'
  | 'featured_cv_30';

const ALL_LOOKUP_KEYS: PriceLookupKey[] = [
  'featured_job_7',
  'featured_job_14',
  'featured_job_30',
  'featured_cv_7',
  'featured_cv_14',
  'featured_cv_30',
];

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedPrices: Record<PriceLookupKey, Stripe.Price> | null = null;
let cachedAt: number | null = null;

function getStripe(): Stripe {
  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(secretKey);
}

/**
 * Fetches active Stripe prices for the given lookup keys and returns a map.
 * Expands each price's product. Throws if any key is missing or inactive.
 */
export async function getPricesByLookupKeys(
  keys: PriceLookupKey[]
): Promise<Record<PriceLookupKey, Stripe.Price>> {
  if (keys.length === 0) {
    return {} as Record<PriceLookupKey, Stripe.Price>;
  }

  const stripe = getStripe();
  const uniqueKeys = [...new Set(keys)];

  const response = await stripe.prices.list({
    active: true,
    lookup_keys: uniqueKeys,
    expand: ['data.product'],
  });

  const byLookupKey = new Map<string, Stripe.Price>();
  for (const price of response.data) {
    if (price.lookup_key) {
      byLookupKey.set(price.lookup_key, price);
    }
  }

  const missing: PriceLookupKey[] = [];
  for (const key of uniqueKeys) {
    if (!byLookupKey.has(key)) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Stripe price(s) missing or inactive for lookup_key(s): ${missing.join(', ')}. ` +
        'Create an active price with each lookup_key in the Stripe Dashboard.'
    );
  }

  const result = {} as Record<PriceLookupKey, Stripe.Price>;
  for (const key of uniqueKeys) {
    result[key] = byLookupKey.get(key)!;
  }
  return result;
}

/**
 * Returns all 6 prices from an in-memory cache (5-minute TTL).
 * Refreshes from Stripe when cache is stale or empty.
 */
export async function getCachedPrices(): Promise<
  Record<PriceLookupKey, Stripe.Price>
> {
  const now = Date.now();
  if (
    cachedPrices !== null &&
    cachedAt !== null &&
    now - cachedAt < CACHE_TTL_MS
  ) {
    return cachedPrices;
  }
  cachedPrices = await getPricesByLookupKeys(ALL_LOOKUP_KEYS);
  cachedAt = Date.now();
  return cachedPrices;
}
