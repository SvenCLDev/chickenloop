import crypto from 'crypto';
import { getReferenceConfirmBaseUrl } from '@/lib/baseUrlForReferenceEmails';

export function generateReferenceToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export { getReferenceConfirmBaseUrl } from '@/lib/baseUrlForReferenceEmails';

export function buildReferenceConfirmUrl(token: string, rehire: boolean): string {
  const base = getReferenceConfirmBaseUrl();
  return `${base}/reference/confirm/${token}?rehire=${rehire ? 'yes' : 'no'}`;
}
