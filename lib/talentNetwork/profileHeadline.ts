export const PROFILE_HEADLINE_MAX_LENGTH = 80;

export type ProfileHeadlineSource = 'ai' | 'manual';

export interface ProfileHeadlineInput {
  lookingForWorkInAreas?: string[];
  experienceAndSkill?: string[];
  verifiedCertificates?: Array<{
    issuingBody?: string;
    certificateLevel?: string;
    disciplines?: string[];
    verificationStatus?: string;
  }>;
  seasonalExperience?: Array<{
    role?: string;
  }>;
}

/** Short display labels for stored sport/activity values. */
const SPORT_SHORT_LABELS: Record<string, string> = {
  kitesurfing: 'Kitesurf',
  'wing foiling': 'Wingfoil',
  windsurfing: 'Windsurf',
  surfing: 'Surf',
  sailing: 'Sailing',
  'scuba-diving': 'Dive',
  'paddle boarding (sup)': 'SUP',
  wakeboarding: 'Wakeboard',
  kayaking: 'Kayak',
  yachting: 'Yacht',
  catamaran: 'Catamaran',
  'e-foil': 'E-foil',
  'hydrofoil kite surfing': 'Hydrofoil Kite',
  'hydrofoil surfing': 'Hydrofoil Surf',
};

export function sportShortLabel(sport: string): string {
  const key = sport.trim().toLowerCase();
  if (SPORT_SHORT_LABELS[key]) return SPORT_SHORT_LABELS[key];
  return sport
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function sanitizeProfileHeadline(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let text = raw.trim();
  if (!text) return null;
  // Strip wrapping quotes and collapse whitespace / newlines
  text = text.replace(/^["'`]+|["'`]+$/g, '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  if (text.length > PROFILE_HEADLINE_MAX_LENGTH) {
    text = text.slice(0, PROFILE_HEADLINE_MAX_LENGTH).trim();
  }
  return text || null;
}

/**
 * Deterministic headline when AI is unavailable or profile has no stored headline.
 */
export function buildDeterministicProfileHeadline(input: ProfileHeadlineInput): string {
  const sports = (input.experienceAndSkill ?? [])
    .map((s) => sportShortLabel(String(s)))
    .filter(Boolean);
  const areas = (input.lookingForWorkInAreas ?? []).map((a) => String(a).trim()).filter(Boolean);
  const seasonalRoles = (input.seasonalExperience ?? [])
    .map((e) => (typeof e.role === 'string' ? e.role.trim() : ''))
    .filter(Boolean);

  const hasInstruction = areas.some((a) => a.toLowerCase() === 'instruction');
  const hasManagement = areas.some((a) => a.toLowerCase() === 'management');

  const uniqueSports = [...new Set(sports)].slice(0, 2);
  const sportPart =
    uniqueSports.length === 0
      ? ''
      : uniqueSports.length === 1
        ? uniqueSports[0]
        : `${uniqueSports[0]} & ${uniqueSports[1]}`;

  if (hasInstruction && hasManagement && sportPart) {
    return clampHeadline(`${sportPart} Instructor & Manager`);
  }
  if (hasInstruction && sportPart) {
    return clampHeadline(`${sportPart} Instructor`);
  }
  if (hasManagement && sportPart) {
    return clampHeadline(`${sportPart} & Centre Manager`);
  }
  if (hasManagement) {
    return 'Watersports Centre Manager';
  }
  if (hasInstruction) {
    return 'Watersports Instructor';
  }
  if (seasonalRoles.length > 0) {
    return clampHeadline(titleCaseWords(seasonalRoles[0]));
  }
  if (sportPart) {
    return clampHeadline(`${sportPart} Professional`);
  }
  if (areas.length > 0) {
    return clampHeadline(`Watersports ${areas[0]} Professional`);
  }
  return 'Watersports Professional';
}

function titleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function clampHeadline(value: string): string {
  const sanitized = sanitizeProfileHeadline(value);
  return sanitized || 'Watersports Professional';
}

export function getDisplayHeadline(candidate: {
  profileHeadline?: string | null;
  lookingForWorkInAreas?: string[];
  experienceAndSkill?: string[];
  fullName?: string;
  displayName?: string;
}): string {
  const stored = sanitizeProfileHeadline(candidate.profileHeadline);
  if (stored) return stored;
  return buildDeterministicProfileHeadline({
    lookingForWorkInAreas: candidate.lookingForWorkInAreas,
    experienceAndSkill: candidate.experienceAndSkill,
  });
}

export function buildHeadlineInputFromProfile(input: ProfileHeadlineInput): ProfileHeadlineInput {
  const certs = (input.verifiedCertificates ?? [])
    .filter((c) => c && (c.issuingBody || c.certificateLevel))
    .slice(0, 8)
    .map((c) => ({
      issuingBody: c.issuingBody,
      certificateLevel: c.certificateLevel,
      disciplines: (c.disciplines ?? []).slice(0, 4),
      verificationStatus: c.verificationStatus,
    }));

  const roles = [
    ...new Set(
      (input.seasonalExperience ?? [])
        .map((e) => (typeof e.role === 'string' ? e.role.trim() : ''))
        .filter(Boolean)
    ),
  ].slice(0, 5);

  return {
    lookingForWorkInAreas: (input.lookingForWorkInAreas ?? []).slice(0, 8),
    experienceAndSkill: (input.experienceAndSkill ?? []).slice(0, 10),
    verifiedCertificates: certs,
    seasonalExperience: roles.map((role) => ({ role })),
  };
}

/** Detect whether professional inputs that affect headlines changed. */
export function headlineInputsChanged(
  before: ProfileHeadlineInput,
  after: ProfileHeadlineInput
): boolean {
  const norm = (v: ProfileHeadlineInput) =>
    JSON.stringify({
      areas: [...(v.lookingForWorkInAreas ?? [])].map(String).sort(),
      sports: [...(v.experienceAndSkill ?? [])].map(String).sort(),
      certs: (v.verifiedCertificates ?? []).map((c) => ({
        b: c.issuingBody,
        l: c.certificateLevel,
        d: [...(c.disciplines ?? [])].sort(),
        s: c.verificationStatus,
      })),
      roles: (v.seasonalExperience ?? [])
        .map((e) => e.role)
        .filter(Boolean)
        .sort(),
    });
  return norm(before) !== norm(after);
}
