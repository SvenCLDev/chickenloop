import sanitizeHtml from 'sanitize-html';

/** Options for job description sanitization: only safe inline/block tags, no attributes. */
const JOB_DESCRIPTION_OPTIONS: Parameters<typeof sanitizeHtml>[1] = {
  allowedTags: ['p', 'strong', 'b', 'ul', 'li', 'br'],
  allowedAttributes: {},
};

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
  return sanitizeHtml(text, JOB_DESCRIPTION_OPTIONS);
}

