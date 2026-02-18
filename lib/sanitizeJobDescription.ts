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
};

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
    .replace(/^style="[^"]*"\s*>/gi, '');
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
export function sanitizeJobDescription(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  const withSpaces = html.replace(/&nbsp;/gi, ' ');
  const noOrphanedStyles = removeOrphanedStyleAttributes(withSpaces);
  const withoutAttrs = stripAllAttributes(noOrphanedStyles);
  const sanitized = sanitizeHtml(withoutAttrs, SANITIZE_OPTIONS);
  const withoutEmpty = removeEmptyTags(sanitized);
  return withoutEmpty.trim();
}
