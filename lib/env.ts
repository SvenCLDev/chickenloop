/**
 * Central env access for app and API routes.
 * All values come from process.env only — never hardcode secrets here.
 */

/** Stripe secret key (sk_live_* or sk_test_*). Server-side only. */
export function getStripeSecretKey(): string | undefined {
  return process.env.STRIPE_SECRET_KEY?.trim() || undefined;
}

/**
 * Stripe webhook signing secret (whsec_*). Used to verify webhook events.
 * Dynamic: use STRIPE_WEBHOOK_SECRET_PREVIEW when VERCEL_ENV is 'preview', otherwise STRIPE_WEBHOOK_SECRET.
 */
export function getStripeWebhookSecret(): string | undefined {
  const isPreview = process.env.VERCEL_ENV === 'preview';
  const secret = isPreview
    ? process.env.STRIPE_WEBHOOK_SECRET_PREVIEW?.trim()
    : process.env.STRIPE_WEBHOOK_SECRET?.trim();
  return secret || undefined;
}

/** CV boost duration in days. Only 7, 14, 30 are supported. */
export const CV_BOOST_DURATIONS = [7, 14, 30] as const;
export type CvBoostDuration = (typeof CV_BOOST_DURATIONS)[number];

/**
 * Returns the Stripe price ID for CV boost for the given duration.
 * Reads STRIPE_CV_BOOST_7_PRICE_ID, STRIPE_CV_BOOST_14_PRICE_ID, STRIPE_CV_BOOST_30_PRICE_ID.
 * Returns undefined if the env var is missing or empty (same error-handling pattern as Job Boost).
 */
export function getCvBoostPriceId(duration: CvBoostDuration): string | undefined {
  const key = `STRIPE_CV_BOOST_${duration}_PRICE_ID` as const;
  const value = process.env[key]?.trim();
  return value || undefined;
}
