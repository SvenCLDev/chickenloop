export const EXPERIENCE_LEVEL_LABELS: Record<string, string> = {
  entry: 'Entry',
  intermediate: 'Intermediate',
  experienced: 'Experienced',
  senior: 'Senior',
};

export const AVAILABILITY_LABELS: Record<string, string> = {
  available_now: 'Available now',
  available_soon: 'Available soon',
  seasonal: 'Seasonal',
  not_available: 'Not available',
};

export function formatExperienceLevel(value?: string | null): string {
  if (!value) return '—';
  return EXPERIENCE_LEVEL_LABELS[value] ?? value;
}

export function formatAvailability(value?: string | null): string {
  if (!value) return '—';
  return AVAILABILITY_LABELS[value] ?? value;
}
