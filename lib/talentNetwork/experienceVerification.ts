import type { SeasonalExperienceFormEntry } from '@/app/components/talentNetwork/formTypes';

export function isCompleteExperienceEntry(entry: SeasonalExperienceFormEntry): boolean {
  return Boolean(
    entry.schoolName.trim() &&
      entry.role.trim() &&
      entry.startMonth &&
      entry.startYear
  );
}

export function countUnverifiedCompleteExperienceEntries(
  entries: SeasonalExperienceFormEntry[]
): number {
  return entries.filter(
    (entry) => isCompleteExperienceEntry(entry) && !entry.referenceEmail?.trim()
  ).length;
}
