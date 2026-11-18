export type TalentNetworkPromoViewer = {
  role?: 'recruiter' | 'job-seeker' | 'admin' | null;
  /** Auth still resolving — do not show to avoid flash. */
  authLoading?: boolean;
  /**
   * For job-seekers: number of CVs owned.
   * Null/undefined while count is loading → hide until known.
   */
  cvCount?: number | null;
};

/**
 * Whether the Talent Network introduction should render for this viewer.
 * Placement rules (page === 1, jobs >= 6) are applied by the caller.
 */
export function shouldShowTalentNetworkPromo(
  viewer: TalentNetworkPromoViewer
): boolean {
  if (viewer.authLoading) return false;
  if (!viewer.role) return true; // anonymous
  if (viewer.role === 'recruiter' || viewer.role === 'admin') return false;
  if (viewer.role === 'job-seeker') {
    if (viewer.cvCount == null) return false;
    return viewer.cvCount === 0;
  }
  return false;
}

export function shouldPlaceTalentNetworkPromo(options: {
  initialPage: number;
  jobCount: number;
  viewerEligible: boolean;
}): boolean {
  return (
    options.viewerEligible &&
    options.initialPage === 1 &&
    options.jobCount >= 6
  );
}
