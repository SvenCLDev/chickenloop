/**
 * Strict server-side sanitization for job descriptions.
 * Applied on save only (not on render).
 */

import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'ul', 'ol', 'li', 'u', 'em'];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {},
  allowedSchemes: [],
  disallowedTagsMode: 'discard', // strip disallowed tags but keep their text content
};

/**
 * Decode HTML entities so that entity-encoded input (e.g. &lt;html&gt;) is turned
 * into real tags before sanitization. Otherwise the sanitizer sees literal text and
 * does not strip disallowed tags.
 */
function decodeHTMLEntities(html: string): string {
  return html
    .replace(/&amp;/gi, '&') // decode &amp; first so &amp;lt; → &lt; → <
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

/**
 * Strip all attributes from tags before sanitization.
 * Handles malformed paste from Word/Google Docs where style="..." with nested quotes
 * can leak into the output as raw text.
 */
function stripAllAttributes(html: string): string {
  return html.replace(/<(\w+)\s+[^>]*?(\s*\/?)>/gi, '<$1$2>');
}

/**
 * Remove orphaned style="..."> fragments (including when not part of a valid tag).
 */
function removeOrphanedStyleAttributes(html: string): string {
  return html
    .replace(/style="[^"]*"\s*>/gi, '')
    .replace(/style='[^']*'\s*>/gi, '')
    .replace(/^style="[^"]*"\s*>/gi, '')
    .replace(/^style='[^']*'\s*>/gi, '');
}

function removeEmptyTags(html: string): string {
  if (!html || typeof html !== 'string') return html;
  let result = html;
  const emptyTagPattern = /<\s*(p|strong|b|em|u|li)(\s[^>]*)?>\s*<\/\s*\1\s*>/gi;
  let prev = '';
  while (prev !== result) {
    prev = result;
    result = result.replace(emptyTagPattern, '');
  }
  return result;
}

/**
 * Sanitize job description HTML before saving to Mongo.
 * Allowed: p, br, strong, b, ul, ol, li, u, em.
 * No attributes (class, style, etc.). Removes span, div, font, script, iframe.
 */
export function sanitizeJobDescription(html: unknown): string {
  const str = html != null && typeof html === 'string' ? html : '';
  if (!str.trim()) {
    return '';
  }
  const decoded = decodeHTMLEntities(str);
  const withSpaces = decoded.replace(/&nbsp;/gi, ' ');
  const noOrphanedStyles = removeOrphanedStyleAttributes(withSpaces);
  const withoutAttrs = stripAllAttributes(noOrphanedStyles);
  const sanitized = sanitizeHtml(withoutAttrs, SANITIZE_OPTIONS);
  const withoutEmpty = removeEmptyTags(sanitized);
  return withoutEmpty.trim();
}
