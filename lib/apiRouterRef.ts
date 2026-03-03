/**
 * Router reference for API layer redirects (e.g. COMPANY_PROFILE_INCOMPLETE).
 * Set by AuthProvider so apiRequest can use router.replace() without circular deps.
 */
let routerRef: { replace: (url: string) => void } | null = null;

export function setApiRouter(r: { replace: (url: string) => void } | null) {
  routerRef = r;
}

export function getApiRouter() {
  return routerRef;
}
