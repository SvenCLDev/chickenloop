import { sanitizeRichTextLite } from '@/utils/sanitizeRichTextLite';

/**
 * Sanitize job descriptions using the shared rich-text-lite subset.
 * Allowed tags: b, ul, li. All attributes removed.
 */
export function sanitizeJobDescription(text: string): string {
  return sanitizeRichTextLite(text);
}

