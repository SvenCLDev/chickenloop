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

export function experienceEndBeforeStart(entry: {
  startMonth: number | '';
  startYear: number | '';
  endMonth?: number | '' | null;
  endYear?: number | '' | null;
}): boolean {
  if (!entry.startMonth || !entry.startYear) return false;

  const endMonth = typeof entry.endMonth === 'number' ? entry.endMonth : null;
  const endYear = typeof entry.endYear === 'number' ? entry.endYear : null;
  if (!endMonth || !endYear) return false;

  const startKey = entry.startYear * 12 + entry.startMonth;
  const endKey = endYear * 12 + endMonth;
  return endKey < startKey;
}

export function getExperienceDateRangeErrorsByIndex(
  entries: SeasonalExperienceFormEntry[]
): Record<number, string> {
  const errors: Record<number, string> = {};
  entries.forEach((entry, index) => {
    if (!isCompleteExperienceEntry(entry)) return;
    if (experienceEndBeforeStart(entry)) {
      errors[index] = 'End date must be on or after the start date.';
    }
  });
  return errors;
}

export function getExperienceDateRangeError(
  entries: SeasonalExperienceFormEntry[]
): string | null {
  const errors = getExperienceDateRangeErrorsByIndex(entries);
  const firstIndex = Object.keys(errors)
    .map(Number)
    .sort((a, b) => a - b)[0];
  if (firstIndex === undefined) return null;

  const entry = entries[firstIndex];
  const label = entry.schoolName.trim() || `Experience ${firstIndex + 1}`;
  return `${label}: ${errors[firstIndex]}`;
}
