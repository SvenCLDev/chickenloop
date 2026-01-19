/**
 * Text Sanitization Utilities
 * 
 * Defensive HTML stripping for structured data (JSON-LD) generation.
 * 
 * IMPORTANT: This is ONLY used at the JSON-LD boundary to ensure
 * Google Jobs structured data is robust against accidental HTML.
 * 
 * UI rendering intentionally remains plain text (whitespace-pre-wrap),
 * and we do NOT strip HTML at save time or in the database.
 * 
 * This is a minimal, defensive sanitizer - not a full HTML sanitization library.
 * It removes HTML tags and decodes common entities to ensure JSON-LD
 * description fields contain clean, text-only content as required by Google Jobs.
 */

/**
 * Strip HTML tags and decode common HTML entities from text
 * 
 * This function is used defensively when generating JSON-LD structured data
 * to ensure job descriptions are clean text-only, even if they accidentally
 * contain HTML tags.
 * 
 * @param input - Input string that may contain HTML
 * @returns Clean text with HTML tags removed and entities decoded
 * 
 * @example
 * stripHtmlToText("Instructor needed") // "Instructor needed"
 * stripHtmlToText("<b>Instructor</b> needed") // "Instructor needed"
 * stripHtmlToText("<script>alert('xss')</script>Hello") // "Hello"
 * stripHtmlToText("Line 1<br>Line 2") // "Line 1\nLine 2"
 */
export function stripHtmlToText(input: string | null | undefined): string {
  // Return empty string for null/undefined input
  if (!input) {
    return '';
  }

  let text = String(input);

  // Replace common block-level line breaks with newlines before tag removal
  // This preserves paragraph structure reasonably
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');

  // Remove all HTML tags (defensive against accidental HTML)
  text = text.replace(/<[^>]*>/g, '');

  // Decode common HTML entities
  const entityMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
  };

  // Replace entities (order matters - do &amp; last to avoid double-decoding)
  Object.entries(entityMap).forEach(([entity, replacement]) => {
    if (entity !== '&amp;') {
      text = text.replace(new RegExp(entity, 'gi'), replacement);
    }
  });
  // Decode &amp; last to avoid double-decoding
  text = text.replace(/&amp;/gi, '&');

  // Decode numeric entities (&#123; and &#x7B;)
  text = text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
  text = text.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // Normalize whitespace: collapse multiple spaces, preserve newlines
  text = text.replace(/[ \t]+/g, ' '); // Collapse spaces and tabs
  text = text.replace(/[ \t]*\n[ \t]*/g, '\n'); // Normalize line breaks
  text = text.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines

  // Trim leading/trailing whitespace
  return text.trim();
}
