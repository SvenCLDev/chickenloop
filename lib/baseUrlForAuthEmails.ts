/**
 * Base URL for links in auth-related emails (password reset, welcome, etc.).
 * Prefer production URL so users never receive links to Vercel preview deployments,
 * which can trigger Vercel's "Access Request" flow and confusion.
 */

const PRODUCTION_APP_URL = 'https://chickenloop.com';

export function getBaseUrlForAuthEmails(): string {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_URL) {
    return PRODUCTION_APP_URL;
  }
  return 'http://localhost:3000';
}
