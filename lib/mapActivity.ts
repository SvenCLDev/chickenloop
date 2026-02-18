import { OFFERED_ACTIVITIES_LIST } from './offeredActivities';
import { ACTIVITY_SYNONYMS } from './activitySynonyms';

function normalize(term: string): string {
  return term
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Map a Drupal activity name to the canonical activity from OFFERED_ACTIVITIES_LIST.
 * Uses ACTIVITY_SYNONYMS for alternate spellings/variants.
 * Returns null if the term cannot be mapped.
 */
export function mapDrupalActivity(drupalActivityName: string): string | null {
  const n = normalize(drupalActivityName);
  if (!n) return null;

  const canonicalNormalized = new Set(
    OFFERED_ACTIVITIES_LIST.map((a) => normalize(a))
  );
  if (canonicalNormalized.has(n)) {
    const match = OFFERED_ACTIVITIES_LIST.find(
      (c) => normalize(c) === n
    );
    return match ?? null;
  }

  for (const [syn, canon] of Object.entries(ACTIVITY_SYNONYMS)) {
    if (normalize(syn) === n) return canon;
  }

  return null;
}
