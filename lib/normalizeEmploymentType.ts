import { EMPLOYMENT_TYPES } from '@/models/Job';

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

/**
 * Normalize employment type for Job schema: lowercase, hyphens to underscores.
 * Example: 'full-time' → 'full_time', 'PART-TIME' → 'part_time'.
 * Does not validate; invalid values will still fail schema validation.
 */
export function normalizeEmploymentType(value: string): EmploymentType {
  const normalized = value.toLowerCase().replace(/-/g, '_');
  return normalized as EmploymentType;
}
