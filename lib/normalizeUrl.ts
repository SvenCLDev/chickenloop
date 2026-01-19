/**
 * Normalize URL to always start with https://
 * 
 * @param input - URL string (may include protocol or be empty)
 * @returns Normalized URL with https:// prefix, or undefined if input is empty
 * 
 * @example
 * normalizeUrl('example.com') // 'https://example.com'
 * normalizeUrl('https://example.com') // 'https://example.com'
 * normalizeUrl('http://example.com') // 'https://example.com'
 * normalizeUrl('') // undefined
 * normalizeUrl(undefined) // undefined
 */
export function normalizeUrl(input?: string): string | undefined {
  if (!input || typeof input !== 'string') {
    return undefined;
  }

  // Trim whitespace
  const trimmed = input.trim();
  
  if (!trimmed) {
    return undefined;
  }

  // Remove protocol prefixes (case-insensitive)
  let url = trimmed.replace(/^(https?:\/\/)?/i, '');
  
  // Remove any trailing slashes from protocol-removed part
  url = url.trim();
  
  if (!url) {
    return undefined;
  }

  // Ensure https:// prefix
  return `https://${url}`;
}
