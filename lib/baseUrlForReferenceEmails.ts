/**
 * Base URL for reference verification links in manager emails.
 * Must match the deployment + database where the token was created.
 * (Unlike auth emails, preview tokens must not point at production.)
 */

const PRODUCTION_APP_URL = 'https://www.chickenloop.com';

export function getReferenceConfirmBaseUrl(): string {
  const override = process.env.REFERENCE_CONFIRM_BASE_URL?.trim().replace(/\/$/, '');
  if (override) return override;

  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (process.env.VERCEL_ENV === 'production') {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
    if (siteUrl) return siteUrl;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
    if (baseUrl) return baseUrl;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return PRODUCTION_APP_URL;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
  if (baseUrl) return baseUrl;
  return 'http://127.0.0.1:3000';
}
