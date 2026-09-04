/** Canonical public site URL for metadata, sitemap, and JSON-LD. */
export function getSiteUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (siteUrl) return siteUrl;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
  if (baseUrl) return baseUrl;

  return 'https://www.chickenloop.com';
}
