import type { CandidateSearchParams } from '@/lib/candidateSearchParams';
import { hasActiveFilters } from '@/lib/candidateSearchParams';

const ARRAY_KEYS = [
  'workArea',
  'language',
  'sport',
  'certification',
  'experienceLevel',
  'availability',
  'preferredCountry',
  'canWorkIn',
  'noSponsorshipIn',
  'workCountry',
] as const;

/**
 * Normalize incoming filters to CandidateSearchParams for storage/matching.
 * Drops empty values, page, and sort (display-only for alerts).
 */
export function sanitizeTalentAlertFilters(
  input: unknown
): CandidateSearchParams | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const out: CandidateSearchParams = {};

  if (typeof raw.kw === 'string' && raw.kw.trim()) {
    out.kw = raw.kw.trim();
  }
  if (typeof raw.location === 'string' && raw.location.trim()) {
    out.location = raw.location.trim();
  }
  if (raw.verifiedOnly === true) {
    out.verifiedOnly = true;
  }

  for (const key of ARRAY_KEYS) {
    const value = raw[key];
    if (Array.isArray(value)) {
      const cleaned = value
        .map((v) => String(v).trim())
        .filter((v) => v.length > 0);
      if (cleaned.length > 0) {
        (out as Record<string, string[]>)[key] = cleaned;
      }
    } else if (typeof value === 'string' && value.trim()) {
      (out as Record<string, string[]>)[key] = [value.trim()];
    }
  }

  if (!hasActiveFilters(out)) return null;
  return out;
}

export function formatTalentFilterChips(
  filters: CandidateSearchParams
): { label: string; value: string }[] {
  const chips: { label: string; value: string }[] = [];
  if (filters.kw) chips.push({ label: 'Keyword', value: filters.kw });
  if (filters.location) chips.push({ label: 'Location', value: filters.location });
  if (filters.sport?.length) chips.push({ label: 'Sport', value: filters.sport.join(', ') });
  if (filters.certification?.length) {
    chips.push({ label: 'Certification', value: filters.certification.join(', ') });
  }
  if (filters.availability?.length) {
    chips.push({ label: 'Availability', value: filters.availability.join(', ') });
  }
  if (filters.workArea?.length) {
    chips.push({ label: 'Work area', value: filters.workArea.join(', ') });
  }
  if (filters.language?.length) {
    chips.push({ label: 'Language', value: filters.language.join(', ') });
  }
  if (filters.experienceLevel?.length) {
    chips.push({ label: 'Experience', value: filters.experienceLevel.join(', ') });
  }
  if (filters.canWorkIn?.length) {
    chips.push({ label: 'Can work in', value: filters.canWorkIn.join(', ') });
  }
  if (filters.preferredCountry?.length) {
    chips.push({ label: 'Open to', value: filters.preferredCountry.join(', ') });
  }
  if (filters.noSponsorshipIn?.length) {
    chips.push({
      label: 'No sponsorship',
      value: filters.noSponsorshipIn.join(', '),
    });
  }
  if (filters.workCountry?.length) {
    chips.push({ label: 'Work country', value: filters.workCountry.join(', ') });
  }
  if (filters.verifiedOnly) chips.push({ label: 'Verified', value: 'Yes' });
  return chips;
}

export function buildDefaultTalentAlertName(filters: CandidateSearchParams): string {
  const parts: string[] = [];
  if (filters.sport?.[0]) parts.push(filters.sport[0]);
  if (filters.availability?.[0]) parts.push(filters.availability[0].replace(/_/g, ' '));
  if (filters.location) parts.push(filters.location);
  if (filters.kw) parts.push(`“${filters.kw}”`);
  if (parts.length === 0) return 'Talent search alert';
  return parts.slice(0, 3).join(' · ');
}
