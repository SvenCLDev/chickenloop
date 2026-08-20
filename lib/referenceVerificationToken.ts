import crypto from 'crypto';
import { getReferenceConfirmBaseUrl } from '@/lib/baseUrlForReferenceEmails';

export function generateReferenceToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export { getReferenceConfirmBaseUrl } from '@/lib/baseUrlForReferenceEmails';

export type ReferenceConfirmResponse =
  | 'worked-rehire'
  | 'worked-no-rehire'
  | 'not-worked';

export function buildReferenceConfirmUrl(
  token: string,
  response: ReferenceConfirmResponse
): string {
  const base = getReferenceConfirmBaseUrl();
  switch (response) {
    case 'worked-rehire':
      return `${base}/reference/confirm/${token}?worked=yes&rehire=yes`;
    case 'worked-no-rehire':
      return `${base}/reference/confirm/${token}?worked=yes&rehire=no`;
    case 'not-worked':
      return `${base}/reference/confirm/${token}?worked=no`;
  }
}

export function buildReferenceConfirmPageUrl(token: string): string {
  const base = getReferenceConfirmBaseUrl();
  return `${base}/reference/confirm/${token}`;
}

export interface ReferenceConfirmInput {
  worked: boolean;
  rehire?: boolean;
}

/** Parse worked/rehire query params, including legacy ?rehire=yes|no links. */
export function parseReferenceConfirmParams(params: {
  worked?: string | null;
  rehire?: string | null;
}): ReferenceConfirmInput | null {
  const worked = params.worked;
  const rehire = params.rehire;

  if (worked === 'no') {
    return { worked: false };
  }
  if (worked === 'yes') {
    if (rehire === 'yes') return { worked: true, rehire: true };
    if (rehire === 'no') return { worked: true, rehire: false };
    return null;
  }

  if (rehire === 'yes') return { worked: true, rehire: true };
  if (rehire === 'no') return { worked: true, rehire: false };

  return null;
}

export function parseReferenceConfirmBody(body: unknown): ReferenceConfirmInput | null {
  if (!body || typeof body !== 'object') return null;
  const raw = body as Record<string, unknown>;

  if (raw.worked === false || raw.worked === 'no') {
    return { worked: false };
  }
  if (raw.worked === true || raw.worked === 'yes') {
    const rehire = raw.rehire;
    if (rehire === true || rehire === 'yes') return { worked: true, rehire: true };
    if (rehire === false || rehire === 'no') return { worked: true, rehire: false };
    return null;
  }

  if (raw.rehire === true || raw.rehire === 'yes') {
    return { worked: true, rehire: true };
  }
  if (raw.rehire === false || raw.rehire === 'no') {
    return { worked: true, rehire: false };
  }

  return null;
}
