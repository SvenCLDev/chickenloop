/**
 * Homepage Featured Talent: eligibility, weighted scoring (0–100), soft diversity.
 *
 * Availability uses the existing enum only (date-based bands deferred).
 * Soft diversity caps are relaxed when the eligible pool is too thin to fill `limit`.
 */

import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import CV from '@/models/CV';
import { stripHtmlToText } from '@/lib/sanitizeText';
import { getDisplayHeadline } from '@/lib/talentNetwork/profileHeadline';
import { ISSUING_BODIES } from '@/lib/talentNetwork/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CANDIDATE_POOL_CAP = 150;
const SUMMARY_MIN_CHARS = 40;

const KNOWN_ISSUING_BODIES = new Set(
  ISSUING_BODIES.filter((b) => b !== 'OTHER')
);

/** Soft diversity caps while alternatives remain. */
export const DIVERSITY_MAX_PER_SPORT = 2;
export const DIVERSITY_MAX_PER_COUNTRY = 2;
export const DIVERSITY_MAX_PER_SCHOOL = 2;

export type HomepageTalentCard = {
  _id: string;
  fullName: string;
  profileHeadline?: string;
  summary?: string;
  experienceAndSkill?: string[];
  lookingForWorkInAreas?: string[];
  pictures?: string[];
};

export type ScoreParts = {
  availability: number;
  completeness: number;
  credentials: number;
  activity: number;
  experience: number;
};

export type RankedTalent = {
  id: string;
  total: number;
  parts: ScoreParts;
  primarySport: string;
  country: string;
  school: string;
  professionalProfileUpdatedAt: number;
  card: HomepageTalentCard;
  exclusionReason?: string;
};

export type FeaturedTalentDebug = {
  selected: Array<{
    id: string;
    total: number;
    parts: ScoreParts;
    sport: string;
    country: string;
    school: string;
  }>;
  rejectedReasonCounts: Record<string, number>;
  diversityRelaxed: boolean;
  poolSize: number;
  eligibleCount: number;
};

type SeasonalLike = {
  schoolName?: string;
  role?: string;
  startMonth?: number;
  startYear?: number;
  verificationStatus?: string;
};

type CertLike = {
  issuingBody?: string;
  certificateLevel?: string;
  verificationStatus?: string;
};

export type TalentScoreInput = {
  _id: string;
  fullName?: string;
  published?: boolean;
  pictures?: string[];
  profileHeadline?: string;
  summary?: string;
  availability?: string;
  lookingForWorkInAreas?: string[];
  experienceAndSkill?: string[];
  verifiedCertificates?: CertLike[];
  professionalCertifications?: string[];
  seasonalExperience?: SeasonalLike[];
  languageSkills?: Array<{ language?: string }>;
  languages?: string[];
  address?: string;
  nationalityCountry?: string;
  preferredWorkCountries?: string[];
  workEligibleCountries?: string[];
  professionalProfileUpdatedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  createdAt?: Date | string | null;
};

type CacheEntry = {
  expiresAt: number;
  cards: HomepageTalentCard[];
  debug: FeaturedTalentDebug;
};

let selectionCache: CacheEntry | null = null;

export function clearHomepageFeaturedTalentCache(): void {
  selectionCache = null;
}

function asDateMs(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  const ms = d.getTime();
  return Number.isNaN(ms) ? null : ms;
}

function normalizeKey(value: string | undefined | null): string {
  const trimmed = (value ?? '').trim().toLowerCase();
  return trimmed || 'unknown';
}

export function getPrimarySport(input: TalentScoreInput): string {
  const first = input.experienceAndSkill?.[0];
  return normalizeKey(typeof first === 'string' ? first : undefined);
}

export function getTalentCountry(input: TalentScoreInput): string {
  const raw =
    input.nationalityCountry ||
    input.preferredWorkCountries?.[0] ||
    input.workEligibleCountries?.[0];
  return normalizeKey(typeof raw === 'string' ? raw.toUpperCase() : undefined);
}

export function getPrimarySchool(input: TalentScoreInput): string {
  const entry = (input.seasonalExperience ?? []).find((e) =>
    isCompleteSeasonalEntry(e)
  );
  return normalizeKey(entry?.schoolName);
}

export function isCompleteSeasonalEntry(entry: SeasonalLike): boolean {
  return Boolean(
    typeof entry.schoolName === 'string' &&
      entry.schoolName.trim() &&
      typeof entry.role === 'string' &&
      entry.role.trim() &&
      entry.startMonth &&
      entry.startYear
  );
}

function strippedSummaryLength(summary?: string): number {
  if (!summary) return 0;
  return stripHtmlToText(summary).trim().length;
}

function hasUsableHeadline(input: TalentScoreInput): boolean {
  if (typeof input.profileHeadline === 'string' && input.profileHeadline.trim()) {
    return true;
  }
  return (
    (input.experienceAndSkill?.length ?? 0) > 0 ||
    (input.lookingForWorkInAreas?.length ?? 0) > 0
  );
}

/**
 * Eligibility for homepage Featured Talent.
 * Missing availability does not exclude.
 */
export function getEligibilityFailure(input: TalentScoreInput): string | null {
  if (input.published === false) return 'unpublished';
  if (!Array.isArray(input.pictures) || input.pictures.length === 0 || !input.pictures[0]) {
    return 'no_image';
  }
  if (!hasUsableHeadline(input)) return 'insufficient_headline';

  const hasSport = (input.experienceAndSkill?.length ?? 0) > 0;
  const hasArea = (input.lookingForWorkInAreas?.length ?? 0) > 0;
  const hasSummary = strippedSummaryLength(input.summary) >= SUMMARY_MIN_CHARS;
  const hasExperience = (input.seasonalExperience ?? []).some(isCompleteSeasonalEntry);

  if (!hasSport && !hasArea && !hasSummary && !hasExperience) {
    return 'insufficient_professional_info';
  }
  return null;
}

export function isEligibleForFeaturedTalent(input: TalentScoreInput): boolean {
  return getEligibilityFailure(input) === null;
}

/** A. Availability — max 40 (enum mapping; date bands deferred). */
export function scoreAvailability(availability?: string): number {
  switch (availability) {
    case 'available_now':
      return 40;
    case 'available_soon':
      return 35;
    case 'seasonal':
      return 25;
    case 'not_available':
    default:
      return 0;
  }
}

/** B. Completeness — max 25 */
export function scoreCompleteness(input: TalentScoreInput): number {
  let points = 0;
  if (hasUsableHeadline(input)) points += 5;
  if ((input.experienceAndSkill?.length ?? 0) > 0) points += 5;
  if ((input.lookingForWorkInAreas?.length ?? 0) > 0) points += 3;
  if (
    (typeof input.address === 'string' && input.address.trim()) ||
    (typeof input.nationalityCountry === 'string' && input.nationalityCountry.trim())
  ) {
    points += 4;
  }
  const hasLang =
    (input.languageSkills?.some((l) => l.language?.trim()) ?? false) ||
    (input.languages?.some((l) => typeof l === 'string' && l.trim()) ?? false);
  if (hasLang) points += 4;
  if (strippedSummaryLength(input.summary) >= SUMMARY_MIN_CHARS) points += 4;
  return Math.min(25, points);
}

/** C. Credentials — max 15 */
export function scoreCredentials(input: TalentScoreInput): number {
  const certs = input.verifiedCertificates ?? [];
  const verifiedKnown = certs.filter(
    (c) =>
      c.verificationStatus === 'verified' &&
      c.issuingBody &&
      KNOWN_ISSUING_BODIES.has(c.issuingBody as (typeof ISSUING_BODIES)[number])
  );
  const structuredKnown = certs.filter(
    (c) =>
      c.issuingBody &&
      KNOWN_ISSUING_BODIES.has(c.issuingBody as (typeof ISSUING_BODIES)[number]) &&
      (c.certificateLevel || c.issuingBody)
  );
  const legacy =
    (input.professionalCertifications ?? []).filter(
      (c) => typeof c === 'string' && c.trim()
    ).length > 0;

  let points = 0;
  if (verifiedKnown.length >= 1) {
    points = 10;
    if (verifiedKnown.length >= 2) points += 5;
  } else if (structuredKnown.length >= 1 || legacy) {
    points = 5;
  }
  return Math.min(15, points);
}

/** D. Professional activity — max 15 (uses professionalProfileUpdatedAt only). */
export function scoreActivity(
  professionalProfileUpdatedAt?: Date | string | null,
  nowMs: number = Date.now()
): number {
  const ms = asDateMs(professionalProfileUpdatedAt);
  if (ms == null) return 0;
  const ageDays = (nowMs - ms) / DAY_MS;
  if (ageDays < 0) return 15;
  if (ageDays <= 30) return 15;
  if (ageDays <= 90) return 10;
  if (ageDays <= 180) return 5;
  return 0;
}

/** E. Experience — max 5 */
export function scoreExperience(input: TalentScoreInput): number {
  const complete = (input.seasonalExperience ?? []).filter(isCompleteSeasonalEntry);
  let points = 0;
  if (complete.length >= 3) points = 5;
  else if (complete.length === 2) points = 3;
  else if (complete.length === 1) points = 2;

  const hasConfirmed = complete.some(
    (e) => e.verificationStatus === 'reference_confirmed'
  );
  if (hasConfirmed) points = Math.min(5, points + 1);
  return points;
}

export function scoreTalent(
  input: TalentScoreInput,
  nowMs: number = Date.now()
): { total: number; parts: ScoreParts } {
  const parts: ScoreParts = {
    availability: scoreAvailability(input.availability),
    completeness: scoreCompleteness(input),
    credentials: scoreCredentials(input),
    activity: scoreActivity(input.professionalProfileUpdatedAt, nowMs),
    experience: scoreExperience(input),
  };
  const total = Math.min(
    100,
    parts.availability +
      parts.completeness +
      parts.credentials +
      parts.activity +
      parts.experience
  );
  return { total, parts };
}

function toCard(input: TalentScoreInput): HomepageTalentCard {
  return {
    _id: String(input._id),
    fullName: input.fullName || 'Talent',
    profileHeadline: input.profileHeadline,
    summary: input.summary,
    experienceAndSkill: input.experienceAndSkill,
    lookingForWorkInAreas: input.lookingForWorkInAreas,
    pictures: input.pictures?.slice(0, 1),
  };
}

export function rankEligibleTalent(
  inputs: TalentScoreInput[],
  nowMs: number = Date.now()
): {
  ranked: RankedTalent[];
  rejectedReasonCounts: Record<string, number>;
} {
  const rejectedReasonCounts: Record<string, number> = {};
  const ranked: RankedTalent[] = [];

  for (const input of inputs) {
    const reason = getEligibilityFailure(input);
    if (reason) {
      rejectedReasonCounts[reason] = (rejectedReasonCounts[reason] ?? 0) + 1;
      continue;
    }
    const { total, parts } = scoreTalent(input, nowMs);
    ranked.push({
      id: String(input._id),
      total,
      parts,
      primarySport: getPrimarySport(input),
      country: getTalentCountry(input),
      school: getPrimarySchool(input),
      professionalProfileUpdatedAt:
        asDateMs(input.professionalProfileUpdatedAt) ?? 0,
      card: toCard(input),
    });
  }

  ranked.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.professionalProfileUpdatedAt !== a.professionalProfileUpdatedAt) {
      return b.professionalProfileUpdatedAt - a.professionalProfileUpdatedAt;
    }
    return a.id.localeCompare(b.id);
  });

  return { ranked, rejectedReasonCounts };
}

/**
 * Soft diversity: greedily take from ranked list with caps; if under limit, relax caps.
 */
export function selectWithDiversity(
  ranked: RankedTalent[],
  limit: number = 6
): { selected: RankedTalent[]; diversityRelaxed: boolean } {
  const safeLimit = Math.min(Math.max(0, Math.floor(limit)), 20);
  // Fewer than limit: return all; do not apply diversity (nothing to trade off).
  if (ranked.length < safeLimit) {
    return { selected: [...ranked], diversityRelaxed: false };
  }

  const trySelect = (enforceCaps: boolean): RankedTalent[] => {
    const selected: RankedTalent[] = [];
    const sportCounts = new Map<string, number>();
    const countryCounts = new Map<string, number>();
    const schoolCounts = new Map<string, number>();

    for (const candidate of ranked) {
      if (selected.length >= safeLimit) break;

      if (enforceCaps) {
        const sportN = sportCounts.get(candidate.primarySport) ?? 0;
        const countryN = countryCounts.get(candidate.country) ?? 0;
        const schoolN =
          candidate.school === 'unknown'
            ? 0
            : schoolCounts.get(candidate.school) ?? 0;

        if (sportN >= DIVERSITY_MAX_PER_SPORT) continue;
        if (countryN >= DIVERSITY_MAX_PER_COUNTRY) continue;
        if (candidate.school !== 'unknown' && schoolN >= DIVERSITY_MAX_PER_SCHOOL) {
          continue;
        }
      }

      selected.push(candidate);
      sportCounts.set(
        candidate.primarySport,
        (sportCounts.get(candidate.primarySport) ?? 0) + 1
      );
      countryCounts.set(
        candidate.country,
        (countryCounts.get(candidate.country) ?? 0) + 1
      );
      if (candidate.school !== 'unknown') {
        schoolCounts.set(
          candidate.school,
          (schoolCounts.get(candidate.school) ?? 0) + 1
        );
      }
    }
    return selected;
  };

  let selected = trySelect(true);
  let diversityRelaxed = false;
  if (selected.length < safeLimit) {
    diversityRelaxed = true;
    const selectedIds = new Set(selected.map((s) => s.id));
    for (const candidate of ranked) {
      if (selected.length >= safeLimit) break;
      if (selectedIds.has(candidate.id)) continue;
      selected.push(candidate);
      selectedIds.add(candidate.id);
    }
  }

  return { selected, diversityRelaxed };
}

export function selectHomepageFeaturedTalent(
  inputs: TalentScoreInput[],
  limit: number = 6,
  nowMs: number = Date.now()
): {
  cards: HomepageTalentCard[];
  debug: FeaturedTalentDebug;
} {
  const { ranked, rejectedReasonCounts } = rankEligibleTalent(inputs, nowMs);
  const { selected, diversityRelaxed } = selectWithDiversity(ranked, limit);

  return {
    cards: selected.map((s) => s.card),
    debug: {
      selected: selected.map((s) => ({
        id: s.id,
        total: s.total,
        parts: s.parts,
        sport: s.primarySport,
        country: s.country,
        school: s.school,
      })),
      rejectedReasonCounts,
      diversityRelaxed,
      poolSize: inputs.length,
      eligibleCount: ranked.length,
    },
  };
}

async function loadEligibleTalentPool(): Promise<TalentScoreInput[]> {
  await connectDB();

  const pipeline: mongoose.PipelineStage[] = [
    {
      $match: {
        published: { $ne: false },
        pictures: { $exists: true, $not: { $size: 0 } },
        'pictures.0': { $exists: true, $nin: [null, ''] },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'jobSeeker',
        foreignField: '_id',
        as: 'jobSeekerInfo',
        pipeline: [
          { $match: { role: 'job-seeker' } },
          { $project: { _id: 1 } },
          { $limit: 1 },
        ],
      },
    },
    { $match: { jobSeekerInfo: { $ne: [] } } },
    {
      $addFields: {
        _activitySort: {
          $ifNull: ['$professionalProfileUpdatedAt', '$createdAt'],
        },
      },
    },
    { $sort: { _activitySort: -1 } },
    { $limit: CANDIDATE_POOL_CAP },
    {
      $project: {
        _id: 1,
        fullName: 1,
        published: 1,
        pictures: { $slice: ['$pictures', 1] },
        profileHeadline: 1,
        summary: 1,
        availability: 1,
        lookingForWorkInAreas: 1,
        experienceAndSkill: 1,
        verifiedCertificates: {
          issuingBody: 1,
          certificateLevel: 1,
          verificationStatus: 1,
        },
        professionalCertifications: 1,
        seasonalExperience: {
          schoolName: 1,
          role: 1,
          startMonth: 1,
          startYear: 1,
          verificationStatus: 1,
        },
        languageSkills: { language: 1 },
        languages: 1,
        address: 1,
        nationalityCountry: 1,
        preferredWorkCountries: 1,
        workEligibleCountries: 1,
        professionalProfileUpdatedAt: 1,
        updatedAt: 1,
        createdAt: 1,
      },
    },
  ];

  const docs = await CV.aggregate(pipeline).option({ maxTimeMS: 8000 });
  return docs.map((doc) => ({
    ...doc,
    _id: String(doc._id),
  })) as TalentScoreInput[];
}

/**
 * Cached homepage Featured Talent selection (TTL ~24h).
 */
export async function getHomepageFeaturedTalent(
  limit: number = 6,
  options?: { bypassCache?: boolean; includeDebug?: boolean }
): Promise<{
  cards: HomepageTalentCard[];
  debug?: FeaturedTalentDebug;
}> {
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 20);
  const now = Date.now();

  if (!options?.bypassCache && selectionCache && selectionCache.expiresAt > now) {
    return {
      cards: selectionCache.cards.slice(0, safeLimit),
      debug: options?.includeDebug ? selectionCache.debug : undefined,
    };
  }

  const pool = await loadEligibleTalentPool();
  // Always select up to 6 for the shared cache; callers may request fewer.
  const cacheLimit = Math.max(safeLimit, 6);
  const { cards, debug } = selectHomepageFeaturedTalent(pool, cacheLimit, now);

  const withHeadlines = cards.map((card) => ({
    ...card,
    profileHeadline:
      card.profileHeadline ||
      getDisplayHeadline({
        profileHeadline: card.profileHeadline,
        lookingForWorkInAreas: card.lookingForWorkInAreas,
        experienceAndSkill: card.experienceAndSkill,
        fullName: card.fullName,
      }),
  }));

  selectionCache = {
    expiresAt: now + CACHE_TTL_MS,
    cards: withHeadlines,
    debug,
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('[homepage featured talent]', {
      selected: debug.selected.map((s) => ({
        id: s.id,
        total: s.total,
        parts: s.parts,
        sport: s.sport,
        country: s.country,
      })),
      rejectedReasonCounts: debug.rejectedReasonCounts,
      diversityRelaxed: debug.diversityRelaxed,
      poolSize: debug.poolSize,
      eligibleCount: debug.eligibleCount,
    });
  }

  return {
    cards: withHeadlines.slice(0, safeLimit),
    debug: options?.includeDebug ? debug : undefined,
  };
}
