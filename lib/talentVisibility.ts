import type { JWTPayload } from '@/lib/jwt';

export type TalentViewerTier = 'anonymous' | 'community' | 'recruiter';

export function resolveTalentViewerTier(
  user: Pick<JWTPayload, 'role'> | null | undefined
): TalentViewerTier {
  if (!user) return 'anonymous';
  if (user.role === 'recruiter' || user.role === 'admin') return 'recruiter';
  if (user.role === 'job-seeker') return 'community';
  return 'anonymous';
}

export function canSeeTalentContacts(tier: TalentViewerTier): boolean {
  return tier === 'recruiter';
}

export function canOpenTalentProfile(tier: TalentViewerTier): boolean {
  return tier === 'community' || tier === 'recruiter';
}

/** Initials like "JS" from a full name. */
export function getNameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Display form "J. S." for anonymous directory cards. */
export function getAnonymousDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Instructor';
  if (parts.length === 1) return `${parts[0][0]?.toUpperCase() || '?'}.`;
  return `${parts[0][0]?.toUpperCase()}. ${parts[parts.length - 1][0]?.toUpperCase()}.`;
}

function regionFromCv(cv: {
  nationalityCountry?: string;
  preferredWorkCountries?: string[];
  workEligibleCountries?: string[];
}): string | undefined {
  return (
    cv.nationalityCountry ||
    cv.preferredWorkCountries?.[0] ||
    cv.workEligibleCountries?.[0] ||
    undefined
  );
}

/**
 * Strip / redact list-row fields for non-recruiter viewers.
 * Mutates a plain object copy of each CV from loadCVs.
 */
export function applyTalentListVisibility<T extends Record<string, unknown>>(
  cv: T,
  tier: TalentViewerTier
): T & { displayName?: string; regionLabel?: string; profileLinkAllowed?: boolean } {
  const next = { ...cv } as T & {
    displayName?: string;
    regionLabel?: string;
    profileLinkAllowed?: boolean;
    fullName?: string;
    address?: string;
    summary?: string;
    pictures?: string[];
    jobSeeker?: Record<string, unknown>;
    nationalityCountry?: string;
    preferredWorkCountries?: string[];
    workEligibleCountries?: string[];
  };

  const fullName = typeof next.fullName === 'string' ? next.fullName : '';
  next.regionLabel = regionFromCv(next);
  next.profileLinkAllowed = canOpenTalentProfile(tier);

  if (tier === 'recruiter') {
    next.displayName = fullName;
    return next;
  }

  // Never expose contacts on list for community/anonymous
  if (next.jobSeeker && typeof next.jobSeeker === 'object') {
    const { email: _email, name: _name, ...rest } = next.jobSeeker;
    next.jobSeeker = rest;
  }
  delete next.address;

  if (tier === 'anonymous') {
    next.displayName = getAnonymousDisplayName(fullName);
    next.fullName = next.displayName;
    next.pictures = [];
    delete next.summary;
    return next;
  }

  // community (job seeker): full name, no contacts/address
  next.displayName = fullName;
  return next;
}

/**
 * Strip contact PII from a detail CV for non-recruiter viewers.
 * Anonymous callers should not receive a full CV (API returns locked payload instead).
 */
export function applyTalentDetailVisibility(
  cv: Record<string, unknown>,
  tier: TalentViewerTier
): Record<string, unknown> {
  if (tier === 'recruiter') return cv;

  const next = { ...cv };
  delete next.email;
  delete next.phone;
  delete next.address;

  if (next.jobSeeker && typeof next.jobSeeker === 'object' && next.jobSeeker !== null) {
    const js = { ...(next.jobSeeker as Record<string, unknown>) };
    delete js.email;
    next.jobSeeker = js;
  }

  return next;
}
