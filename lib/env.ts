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
