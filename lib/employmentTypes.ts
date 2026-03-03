export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Internship' },
  { value: 'project', label: 'Project' },
  { value: 'other', label: 'Other' },
] as const;

export function getEmploymentTypeLabel(value: string): string {
  const opt = EMPLOYMENT_TYPE_OPTIONS.find((o) => o.value === value);
  return opt?.label ?? value;
}
