export const TALENT_LIST_PATH = '/talent';

export function talentProfilePath(id: string): string {
  return `/talent/${id}`;
}

export function talentListUrl(query?: string): string {
  return query ? `${TALENT_LIST_PATH}?${query}` : TALENT_LIST_PATH;
}

/** Profile link that preserves a list/filter return path for “Back to Profiles”. */
export function talentProfileHref(id: string, returnUrl?: string): string {
  const base = talentProfilePath(id);
  if (!returnUrl) return base;
  return `${base}?returnUrl=${encodeURIComponent(returnUrl)}`;
}
