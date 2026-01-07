/**
 * Candidate Search Filter Groups
 * 
 * This file defines the grouping of filters for candidate search into primary and secondary categories.
 * The grouping mirrors the job search logic for consistency across the application.
 * 
 * Primary filters (top bar):
 * - Work Area: Most important filter for matching candidates to job requirements
 * - Language: Critical for communication requirements
 * 
 * Secondary filters (sidebar):
 * - Sports: Additional qualification/experience filter
 * - Certifications: Professional qualification filter
 * - Experience Level: Career stage filter
 * - Availability: Timing/availability filter
 * 
 * This structure allows for:
 * - Consistent UI placement across job and candidate search
 * - Logical grouping of most-used vs. less-used filters
 * - Easy extension for future filter additions
 */

/**
 * Filter group types
 */
export type FilterGroup = 'primary' | 'secondary';

/**
 * Filter field names used in candidate search
 */
export type CandidateFilterField = 
  | 'workArea'
  | 'language'
  | 'sport'
  | 'certification'
  | 'experienceLevel'
  | 'availability';

/**
 * Filter group definition
 */
export interface FilterGroupDefinition {
  /** The filter field name */
  field: CandidateFilterField;
  /** Which group this filter belongs to */
  group: FilterGroup;
  /** Display label for the filter */
  label: string;
  /** Whether this filter supports multi-select */
  multiSelect: boolean;
  /** Order within the group (lower = appears first) */
  order: number;
}

/**
 * Primary filters (top bar) - Most important filters for candidate matching
 * These are the filters that recruiters use most frequently to narrow down candidates
 */
export const PRIMARY_FILTERS: FilterGroupDefinition[] = [
  {
    field: 'workArea',
    group: 'primary',
    label: 'Work Area',
    multiSelect: true,
    order: 1,
  },
  {
    field: 'language',
    group: 'primary',
    label: 'Language',
    multiSelect: true,
    order: 2,
  },
];

/**
 * Secondary filters (sidebar) - Additional qualification filters
 * These filters provide additional refinement options
 */
export const SECONDARY_FILTERS: FilterGroupDefinition[] = [
  {
    field: 'sport',
    group: 'secondary',
    label: 'Sports',
    multiSelect: true,
    order: 1,
  },
  {
    field: 'certification',
    group: 'secondary',
    label: 'Certifications',
    multiSelect: true,
    order: 2,
  },
  {
    field: 'experienceLevel',
    group: 'secondary',
    label: 'Experience Level',
    multiSelect: true,
    order: 3,
  },
  {
    field: 'availability',
    group: 'secondary',
    label: 'Availability',
    multiSelect: true,
    order: 4,
  },
];

/**
 * All filter definitions combined
 */
export const ALL_FILTER_DEFINITIONS: FilterGroupDefinition[] = [
  ...PRIMARY_FILTERS,
  ...SECONDARY_FILTERS,
];

/**
 * Get filter definition by field name
 */
export function getFilterDefinition(field: CandidateFilterField): FilterGroupDefinition | undefined {
  return ALL_FILTER_DEFINITIONS.find(def => def.field === field);
}

/**
 * Get all filters in a specific group
 */
export function getFiltersByGroup(group: FilterGroup): FilterGroupDefinition[] {
  return ALL_FILTER_DEFINITIONS
    .filter(def => def.group === group)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get primary filters (sorted by order)
 */
export function getPrimaryFilters(): FilterGroupDefinition[] {
  return getFiltersByGroup('primary');
}

/**
 * Get secondary filters (sorted by order)
 */
export function getSecondaryFilters(): FilterGroupDefinition[] {
  return getFiltersByGroup('secondary');
}

/**
 * Check if a filter field is a primary filter
 */
export function isPrimaryFilter(field: CandidateFilterField): boolean {
  return PRIMARY_FILTERS.some(def => def.field === field);
}

/**
 * Check if a filter field is a secondary filter
 */
export function isSecondaryFilter(field: CandidateFilterField): boolean {
  return SECONDARY_FILTERS.some(def => def.field === field);
}

