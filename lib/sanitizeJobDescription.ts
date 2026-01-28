import sanitizeHtml from 'sanitize-html';

/**
 * Sanitize job descriptions to allow only a very small, safe HTML subset.
 *
 * - Allowed tags: p, strong, b, ul, li, br
 * - All attributes are stripped
 * - All other tags are removed but their text content is preserved
 */
export function sanitizeJobDescription(text: string): string {
  if (!text) {
    return '';
  }

  return sanitizeHtml(text, {
    allowedTags: ['p', 'strong', 'b', 'ul', 'li', 'br'],
    allowedAttributes: {},
    // Default behaviour is to discard disallowed tags while keeping text content,
    // which is what we want for things like <span>, <div>, <style>, <script>, etc.
  });
}

