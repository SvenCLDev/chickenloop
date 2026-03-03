/**
 * Company name and URL normalization utilities.
 */

/**
 * Normalizes a company name for comparison or storage:
 * lowercase, remove punctuation, collapse whitespace, trim.
 */
export function normalizeCompanyName(name: string): string {
  if (typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '') // remove punctuation (keep letters, numbers, spaces)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts the hostname from a URL: strip http/https, remove www, hostname only.
 * Returns null if the URL is invalid or missing.
 */
export function extractDomain(url?: string): string | null {
  if (url == null || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  let href = trimmed;
  if (!/^https?:\/\//i.test(href)) {
    href = `https://${href}`;
  }

  try {
    const u = new URL(href);
    let host = u.hostname;
    if (host.startsWith('www.')) {
      host = host.slice(4);
    }
    return host || null;
  } catch {
    return null;
  }
}
