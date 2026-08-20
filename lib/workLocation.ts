import type { Document } from 'mongoose';
import type { ICV } from '@/models/CV';
import { COUNTRY_OPTIONS } from '@/lib/countryUtils';
import {
  WORK_AUTHORIZATION_STATUSES,
  type WorkAuthorization,
  type WorkAuthorizationStatus,
} from '@/lib/talentNetwork/types';

/** EU member states + EEA (IS, LI, NO) + Switzerland — right to work bloc for seasonal hiring */
export const EU_EEA_CH_COUNTRY_CODES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO', 'CH',
] as const;

const VALID_COUNTRY_CODES = new Set(COUNTRY_OPTIONS.map((c) => c.code));

export function isValidCountryCode(code: unknown): code is string {
  return typeof code === 'string' && VALID_COUNTRY_CODES.has(code.trim().toUpperCase());
}

export function normalizeCountryCode(code: unknown): string | null {
  if (!isValidCountryCode(code)) return null;
  return code.trim().toUpperCase();
}

export function normalizeCountryCodeList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const code = normalizeCountryCode(value);
    if (code && !seen.has(code)) {
      seen.add(code);
      result.push(code);
    }
  }
  return result.sort();
}

export function isWorkAuthorizationStatus(value: unknown): value is WorkAuthorizationStatus {
  return (
    typeof value === 'string' &&
    (WORK_AUTHORIZATION_STATUSES as readonly string[]).includes(value)
  );
}

function parseOptionalDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function validateWorkAuthorization(
  input: unknown
): { ok: true; value: WorkAuthorization } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Work authorization must be an object' };
  }
  const raw = input as Record<string, unknown>;
  const country = normalizeCountryCode(raw.country);
  if (!country) {
    return { ok: false, error: 'Invalid work authorization country' };
  }
  if (!isWorkAuthorizationStatus(raw.status)) {
    return { ok: false, error: 'Invalid work authorization status' };
  }
  const notes =
    typeof raw.notes === 'string' && raw.notes.trim()
      ? raw.notes.trim().slice(0, 200)
      : undefined;
  const permitType =
    typeof raw.permitType === 'string' && raw.permitType.trim()
      ? raw.permitType.trim().slice(0, 100)
      : undefined;
  return {
    ok: true,
    value: {
      country,
      status: raw.status,
      permitType,
      validUntil: parseOptionalDate(raw.validUntil),
      notes,
    },
  };
}

export function mergeEligibleCountries(
  base: string[],
  euEeaWorkRights?: boolean
): string[] {
  const merged = new Set(base);
  if (euEeaWorkRights) {
    for (const code of EU_EEA_CH_COUNTRY_CODES) {
      merged.add(code);
    }
  }
  return Array.from(merged).sort();
}

/** Countries where status is not requires_sponsorship */
export function computeCanWorkWithoutSponsorshipIn(
  workAuthorizations: WorkAuthorization[] | undefined
): string[] {
  if (!workAuthorizations?.length) return [];
  const codes = new Set<string>();
  for (const entry of workAuthorizations) {
    if (entry.status !== 'requires_sponsorship') {
      codes.add(entry.country);
    }
  }
  return Array.from(codes).sort();
}

/** Union of explicit eligible countries and countries from authorization entries */
export function computeWorkEligibleCountries(
  workEligibleCountries: string[],
  workAuthorizations: WorkAuthorization[] | undefined,
  nationalityCountry?: string,
  euEeaWorkRights?: boolean
): string[] {
  let merged = mergeEligibleCountries(workEligibleCountries, euEeaWorkRights);

  if (merged.length === 0 && nationalityCountry) {
    merged = [nationalityCountry];
  }

  if (workAuthorizations?.length) {
    const fromAuth = workAuthorizations
      .filter((a) => a.status !== 'requires_sponsorship')
      .map((a) => a.country);
    merged = Array.from(new Set([...merged, ...fromAuth])).sort();
  }

  return merged;
}

export interface WorkLocationInput {
  nationalityCountry?: unknown;
  preferredWorkCountries?: unknown;
  workEligibleCountries?: unknown;
  euEeaWorkRights?: unknown;
  workAuthorizations?: unknown;
}

export function applyWorkLocationFieldsToCv(
  cv: Document & ICV,
  body: WorkLocationInput
): { ok: true } | { ok: false; error: string } {
  const hasAnyField =
    body.nationalityCountry !== undefined ||
    body.preferredWorkCountries !== undefined ||
    body.workEligibleCountries !== undefined ||
    body.euEeaWorkRights !== undefined ||
    body.workAuthorizations !== undefined;

  if (!hasAnyField) {
    return { ok: true };
  }

  if (body.nationalityCountry !== undefined) {
    if (body.nationalityCountry === null || body.nationalityCountry === '') {
      cv.nationalityCountry = undefined;
    } else {
      const code = normalizeCountryCode(body.nationalityCountry);
      if (!code) {
        return { ok: false, error: 'Invalid nationality country code' };
      }
      cv.nationalityCountry = code;
    }
  }

  if (body.preferredWorkCountries !== undefined) {
    cv.preferredWorkCountries = normalizeCountryCodeList(body.preferredWorkCountries);
    cv.markModified('preferredWorkCountries');
  }

  const euEeaWorkRights =
    body.euEeaWorkRights !== undefined
      ? body.euEeaWorkRights === true
      : cv.euEeaWorkRights === true;

  if (body.euEeaWorkRights !== undefined) {
    cv.euEeaWorkRights = body.euEeaWorkRights === true;
  }

  let workAuthorizations = cv.workAuthorizations ?? [];
  if (body.workAuthorizations !== undefined) {
    if (!Array.isArray(body.workAuthorizations)) {
      return { ok: false, error: 'workAuthorizations must be an array' };
    }
    const parsed: WorkAuthorization[] = [];
    for (const item of body.workAuthorizations) {
      const result = validateWorkAuthorization(item);
      if (!result.ok) return result;
      parsed.push(result.value);
    }
    workAuthorizations = parsed;
    cv.workAuthorizations = workAuthorizations;
    cv.markModified('workAuthorizations');
  }

  if (
    body.workEligibleCountries !== undefined ||
    body.euEeaWorkRights !== undefined ||
    body.workAuthorizations !== undefined ||
    body.nationalityCountry !== undefined
  ) {
    const baseEligible =
      body.workEligibleCountries !== undefined
        ? normalizeCountryCodeList(body.workEligibleCountries)
        : normalizeCountryCodeList(cv.workEligibleCountries ?? []);

    cv.workEligibleCountries = computeWorkEligibleCountries(
      baseEligible,
      workAuthorizations,
      cv.nationalityCountry,
      euEeaWorkRights
    );
    cv.markModified('workEligibleCountries');

    cv.canWorkWithoutSponsorshipIn = computeCanWorkWithoutSponsorshipIn(workAuthorizations);
    if (cv.canWorkWithoutSponsorshipIn.length === 0 && cv.workEligibleCountries.length > 0) {
      cv.canWorkWithoutSponsorshipIn = [...cv.workEligibleCountries];
    }
    cv.markModified('canWorkWithoutSponsorshipIn');
  }

  return { ok: true };
}
