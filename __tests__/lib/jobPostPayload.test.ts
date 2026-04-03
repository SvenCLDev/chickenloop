import {
  assertJobJsonPayloadFits,
  estimateJsonPayloadBytes,
  looksLikePayloadTooLargeError,
  MAX_JOB_JSON_PAYLOAD_BYTES,
  sanitizeJobDescriptionForSubmit,
  stripDataImageUris,
} from '@/lib/jobPostPayload';

describe('jobPostPayload', () => {
  describe('stripDataImageUris', () => {
    it('removes one data:image base64 URI and counts it', () => {
      const uri =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      const { text, removedCount } = stripDataImageUris(`before ${uri} after`);
      expect(removedCount).toBe(1);
      expect(text).toBe('before  after');
    });

    it('returns zero removals for normal text', () => {
      const { text, removedCount } = stripDataImageUris('Hello <b>world</b>');
      expect(removedCount).toBe(0);
      expect(text).toBe('Hello <b>world</b>');
    });
  });

  describe('sanitizeJobDescriptionForSubmit', () => {
    it('delegates to stripDataImageUris', () => {
      const b64 = 'data:image/jpeg;base64,abcd';
      const { description, strippedImageCount } = sanitizeJobDescriptionForSubmit(`x${b64}y`);
      expect(strippedImageCount).toBe(1);
      expect(description).toBe('xy');
    });
  });

  describe('assertJobJsonPayloadFits', () => {
    it('returns null when under limit', () => {
      expect(assertJobJsonPayloadFits({ a: 1 })).toBeNull();
    });

    it('returns message when JSON exceeds limit', () => {
      const huge = 'x'.repeat(MAX_JOB_JSON_PAYLOAD_BYTES + 10_000);
      const msg = assertJobJsonPayloadFits({ description: huge });
      expect(msg).toBeTruthy();
      expect(msg).toMatch(/too large/i);
    });
  });

  describe('estimateJsonPayloadBytes', () => {
    it('matches Blob size of JSON.stringify', () => {
      const p = { foo: 'bar', n: 1 };
      expect(estimateJsonPayloadBytes(p)).toBe(new Blob([JSON.stringify(p)]).size);
    });
  });

  describe('looksLikePayloadTooLargeError', () => {
    it('detects known platform strings', () => {
      expect(looksLikePayloadTooLargeError('FUNCTION_PAYLOAD_TOO_LARGE')).toBe(true);
      expect(looksLikePayloadTooLargeError('Request Entity Too Large')).toBe(true);
      expect(looksLikePayloadTooLargeError('entity_too_large')).toBe(true);
    });

    it('returns false for unrelated text', () => {
      expect(looksLikePayloadTooLargeError('Not found')).toBe(false);
    });
  });
});
