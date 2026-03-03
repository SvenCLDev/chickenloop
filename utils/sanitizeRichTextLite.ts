import sanitizeHtml from 'sanitize-html';

/** Allowed tags: b, ul, li, br (strong is allowed in input and transformed to b). All attributes removed. */
const RICH_TEXT_LITE_OPTIONS: Parameters<typeof sanitizeHtml>[1] = {
  allowedTags: ['b', 'strong', 'ul', 'li', 'br'],
  allowedAttributes: {},
  transformTags: {
    strong: () => ({ tagName: 'b', attribs: {} }),
  },
};

/**
 * Unwrap <p> tags: remove them and insert <br> between paragraphs so legacy job descriptions render cleanly.
 * Does not allow <p> in output; converts paragraph boundaries to line breaks.
 */
function unwrapParagraphs(html: string): string {
  if (!html || typeof html !== 'string') return html;
  return html
    .replace(/<\/p>\s*<p/gi, '<br>')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '');
}

/**
 * Sanitize rich text to allow only <b>, <ul>, <li>, and <br>.
 * <p> tags are removed (unwrap) with <br> between paragraphs for clean legacy rendering.
 * All attributes are stripped. Used by the Job description field (RichTextLite / JobDescriptionEditor) and API.
 */
export function sanitizeRichTextLite(text: string): string {
  if (!text) {
    return '';
  }
  const withoutP = unwrapParagraphs(text);
  return sanitizeHtml(withoutP, RICH_TEXT_LITE_OPTIONS);
}
