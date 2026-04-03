/**
 * Job create/update JSON must stay under Vercel serverless body limits (~4.5MB).
 * We use a conservative client-side cap so recruiters get a clear error before the edge rejects the request.
 */
export const MAX_JOB_JSON_PAYLOAD_BYTES = 3 * 1024 * 1024;

export const PAYLOAD_TOO_LARGE_USER_MESSAGE =
  'This job is too large to save. That often happens when images are pasted into the description. Remove images from the description or add them using the job photo upload, then try again.';

/** e.g. image/png, image/svg+xml */
const DATA_IMAGE_PREFIX = /data:image\/[^;]+;base64,/gi;

export function looksLikePayloadTooLargeError(text: string): boolean {
  const u = text.toUpperCase();
  return (
    u.includes('FUNCTION_PAYLOAD_TOO_LARGE') ||
    u.includes('REQUEST ENTITY TOO LARGE') ||
    u.includes('ENTITY_TOO_LARGE')
  );
}

export function estimateJsonPayloadBytes(payload: unknown): number {
  return new Blob([JSON.stringify(payload)]).size;
}

const BASE64_CHUNK = /[A-Za-z0-9+/=\r\n]/;

/**
 * Removes inline data-URI images from HTML or plain text (pasted base64 blobs).
 * After `;base64,`, consumes only a valid base64 quantum (length multiple of 4 after
 * ignoring newlines) so trailing letters like "…base64,abcdy" keep the "y".
 */
export function stripDataImageUris(input: string): { text: string; removedCount: number } {
  if (!input) {
    return { text: '', removedCount: 0 };
  }
  let removedCount = 0;
  let out = '';
  let i = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(DATA_IMAGE_PREFIX.source, DATA_IMAGE_PREFIX.flags);
  while ((m = re.exec(input)) !== null) {
    const start = m.index;
    if (start > i) {
      out += input.slice(i, start);
    }
    let j = m.index + m[0].length;
    const payloadStart = j;
    while (j < input.length && BASE64_CHUNK.test(input[j])) {
      j += 1;
    }
    let end = j;
    while (end > payloadStart) {
      const body = input.slice(payloadStart, end).replace(/[\r\n]/g, '');
      if (body.length % 4 === 0) break;
      end -= 1;
    }
    removedCount += 1;
    i = end;
  }
  out += input.slice(i);
  return { text: out, removedCount };
}

export function sanitizeJobDescriptionForSubmit(description: string): {
  description: string;
  strippedImageCount: number;
} {
  const { text, removedCount } = stripDataImageUris(description);
  return { description: text, strippedImageCount: removedCount };
}

export function assertJobJsonPayloadFits(payload: unknown): string | null {
  const n = estimateJsonPayloadBytes(payload);
  if (n > MAX_JOB_JSON_PAYLOAD_BYTES) {
    const mb = (n / (1024 * 1024)).toFixed(1);
    return `${PAYLOAD_TOO_LARGE_USER_MESSAGE} (this save was about ${mb} MB).`;
  }
  return null;
}
