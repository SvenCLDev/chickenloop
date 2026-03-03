/**
 * Maps product keys (e.g. FEATURED_JOB_14_DAYS) to Stripe prices via dynamic
 * lookup by lookup_key. Uses lib/stripe/prices.ts (cached). Server-only.
 */
import type { PriceLookupKey } from '@/lib/stripe/prices';
import { getCachedPrices } from '@/lib/stripe/prices';

export const STRIPE_PRODUCT_KEYS = [
  'FEATURED_JOB_7_DAYS',
  'FEATURED_JOB_14_DAYS',
  'FEATURED_JOB_30_DAYS',
  'FEATURED_CV_7_DAYS',
  'FEATURED_CV_14_DAYS',
  'FEATURED_CV_30_DAYS',
] as const;

export type StripeProductKey = (typeof STRIPE_PRODUCT_KEYS)[number];

const PRODUCT_KEY_TO_LOOKUP: Record<StripeProductKey, PriceLookupKey> = {
  FEATURED_JOB_7_DAYS: 'featured_job_7',
  FEATURED_JOB_14_DAYS: 'featured_job_14',
  FEATURED_JOB_30_DAYS: 'featured_job_30',
  FEATURED_CV_7_DAYS: 'featured_cv_7',
  FEATURED_CV_14_DAYS: 'featured_cv_14',
  FEATURED_CV_30_DAYS: 'featured_cv_30',
};

/**
 * Returns the Stripe price ID for a product key by fetching from Stripe (cached).
 * @throws Error if productKey is unknown or if the price is missing/inactive in Stripe.
 */
export async function getPriceIdFromProductKey(productKey: string): Promise<string> {
  const key = productKey.trim();
  if (!STRIPE_PRODUCT_KEYS.includes(key as StripeProductKey)) {
    throw new Error(
      `Unknown Stripe product key: "${productKey}". Valid keys: ${STRIPE_PRODUCT_KEYS.join(', ')}.`
    );
  }
  const prices = await getCachedPrices();
  const lookupKey = PRODUCT_KEY_TO_LOOKUP[key as StripeProductKey];
  const price = prices[lookupKey];
  if (!price?.id) {
    throw new Error(
      `Stripe price missing or inactive for lookup_key: ${lookupKey}. Configure it in the Stripe Dashboard.`
    );
  }
  return price.id;
}
