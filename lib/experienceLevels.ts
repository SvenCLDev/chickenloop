export const EXPERIENCE_LEVEL_OPTIONS = [
  { value: 'internship', label: 'Internship' },
  { value: 'junior', label: 'Junior' },
  { value: 'senior', label: 'Senior' },
  { value: 'expert', label: 'Expert' },
  { value: 'manager', label: 'Manager' },
] as const;

export function getExperienceLevelLabel(value: string): string {
  const opt = EXPERIENCE_LEVEL_OPTIONS.find((o) => o.value === value);
  return opt?.label ?? value;
}
