import type { JobListFilters } from '@/lib/jobs';

const SAVABLE_FILTER_KEYS = [
  'keyword',
  'location',
  'country',
  'category',
  'activity',
  'language',
] as const satisfies readonly (keyof JobListFilters)[];

/** True when at least one filter mappable to SavedSearch is active */
export function hasSavableAlertFilters(filters: JobListFilters): boolean {
  return SAVABLE_FILTER_KEYS.some((key) => Boolean(filters[key]?.trim()));
}

export function buildDefaultAlertName(
  filters: JobListFilters,
  labels?: { category?: string; country?: string }
): string {
  const parts: string[] = [];
  if (filters.keyword?.trim()) parts.push(filters.keyword.trim());
  if (filters.location?.trim()) parts.push(filters.location.trim());
  if (filters.country?.trim()) parts.push(labels?.country || filters.country.trim());
  if (filters.category?.trim()) parts.push(labels?.category || filters.category.trim());
  if (filters.activity?.trim()) parts.push(filters.activity.trim());
  if (filters.language?.trim()) parts.push(filters.language.trim());
  return parts.slice(0, 4).join(' · ') || 'My job alert';
}

export function buildSavedSearchPayload(
  filters: JobListFilters,
  name: string,
  frequency: 'daily' | 'weekly'
): Record<string, string> {
  const payload: Record<string, string> = { name: name.trim(), frequency };
  if (filters.keyword?.trim()) payload.keyword = filters.keyword.trim();
  if (filters.location?.trim()) payload.location = filters.location.trim();
  if (filters.country?.trim()) payload.country = filters.country.trim();
  if (filters.category?.trim()) payload.category = filters.category.trim();
  if (filters.activity?.trim()) payload.activity = filters.activity.trim();
  if (filters.language?.trim()) payload.language = filters.language.trim();
  return payload;
}

export interface JobAlertSourceAttributes {
  category?: string;
  activity?: string;
  country?: string;
  language?: string;
}

/** Build JobListFilters from job attributes for saved search creation */
export function buildFiltersFromJobAttributes(
  attrs: JobAlertSourceAttributes
): JobListFilters {
  const filters: JobListFilters = {};
  if (attrs.category?.trim()) filters.category = attrs.category.trim();
  if (attrs.activity?.trim()) filters.activity = attrs.activity.trim();
  if (attrs.country?.trim()) filters.country = attrs.country.trim();
  if (attrs.language?.trim()) filters.language = attrs.language.trim();
  return filters;
}
