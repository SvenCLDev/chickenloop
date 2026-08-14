import crypto from 'crypto';

export function generateReferenceToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function getReferenceConfirmBaseUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (siteUrl) return siteUrl;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
  if (baseUrl) return baseUrl;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://127.0.0.1:3000';
}

export function buildReferenceConfirmUrl(token: string, rehire: boolean): string {
  const base = getReferenceConfirmBaseUrl();
  return `${base}/reference/confirm/${token}?rehire=${rehire ? 'yes' : 'no'}`;
}
