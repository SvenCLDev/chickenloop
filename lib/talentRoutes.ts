export const TALENT_LIST_PATH = '/talent';

export function talentProfilePath(id: string): string {
  return `/talent/${id}`;
}

export function talentListUrl(query?: string): string {
  return query ? `${TALENT_LIST_PATH}?${query}` : TALENT_LIST_PATH;
}
