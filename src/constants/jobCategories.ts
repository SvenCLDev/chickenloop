/**
 * Job Categories - Single Source of Truth
 * 
 * This file defines the canonical list of job categories used throughout the application.
 * Use JOB_CATEGORIES for display and validation.
 * Use JOB_CATEGORY_SLUGS for URL-safe slugs when needed.
 */

/**
 * Array of allowed job category strings
 * These are the canonical category values stored in the database
 */
export const JOB_CATEGORIES = [
  "Instruction",
  "Support",
  "Hospitality",
  "Events",
  "Management",
  "Operations",
  "Maintenance",
  "Marketing",
  "Creative",
  "Sales"
] as const;

/**
 * Optional mapping for URL slugs (lowercase)
 * Maps category names to URL-safe slug values
 */
export const JOB_CATEGORY_SLUGS: Record<string, string> = {
  "Instruction": "instruction",
  "Support": "support",
  "Hospitality": "hospitality",
  "Events": "events",
  "Management": "management",
  "Operations": "operations",
  "Maintenance": "maintenance",
  "Marketing": "marketing",
  "Creative": "creative",
  "Sales": "sales"
};

/**
 * Type definition for job category values
 */
export type JobCategory = typeof JOB_CATEGORIES[number];

/**
 * Convert category label to URL slug
 * @param label - Category label (e.g., "Instruction")
 * @returns URL slug (e.g., "instruction") or the label if no slug mapping exists
 */
export function categoryLabelToSlug(label: string): string {
  return JOB_CATEGORY_SLUGS[label] || label.toLowerCase();
}

/**
 * Convert category slug to label
 * @param slug - URL slug (e.g., "instruction")
 * @returns Category label (e.g., "Instruction") or the slug if no mapping exists
 */
export function categorySlugToLabel(slug: string): string | null {
  // First try reverse lookup from slug to label
  const entry = Object.entries(JOB_CATEGORY_SLUGS).find(([_, value]) => value === slug.toLowerCase());
  if (entry) {
    return entry[0];
  }
  
  // If not found, check if it's a valid category (case-insensitive)
  const category = JOB_CATEGORIES.find(cat => cat.toLowerCase() === slug.toLowerCase());
  return category || null;
}

