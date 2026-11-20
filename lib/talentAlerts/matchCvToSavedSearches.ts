import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import CV from '@/models/CV';
import TalentSavedSearch, {
  type ITalentSavedSearch,
  type TalentAlertFrequency,
} from '@/models/TalentSavedSearch';
import { buildCvMatchConditions } from '@/lib/loadCVs';
import type { CandidateSearchParams } from '@/lib/candidateSearchParams';

export type MatchedTalentSearch = {
  searchId: string;
  recruiterId: string;
  frequency: TalentAlertFrequency;
  name: string;
};

/**
 * Return active saved searches that match CV and are after the search baseline.
 */
export async function findMatchingTalentSavedSearches(
  cvId: string
): Promise<MatchedTalentSearch[]> {
  await connectDB();

  const cv = await CV.findById(cvId).select('_id createdAt firstSearchableAt published').lean();
  if (!cv || (cv as { published?: boolean }).published === false) {
    return [];
  }

  const searches = await TalentSavedSearch.find({
    active: true,
    frequency: { $ne: 'never' },
  }).lean<ITalentSavedSearch[]>();

  if (searches.length === 0) return [];

  const cvObjectId = new mongoose.Types.ObjectId(cvId);
  const searchableAt =
    (cv as { firstSearchableAt?: Date }).firstSearchableAt ||
    (cv as { createdAt: Date }).createdAt;

  const matches: MatchedTalentSearch[] = [];

  for (const search of searches) {
    const baseline = search.baselineAt ? new Date(search.baselineAt) : null;
    if (baseline && searchableAt && new Date(searchableAt) <= baseline) {
      continue;
    }

    const conditions = buildCvMatchConditions(
      (search.filters || {}) as CandidateSearchParams
    );
    const hit = await CV.findOne({ _id: cvObjectId, ...conditions })
      .select('_id')
      .lean();
    if (!hit) continue;

    matches.push({
      searchId: String(search._id),
      recruiterId: String(search.recruiterId),
      frequency: search.frequency,
      name: search.name,
    });
  }

  return matches;
}

/** Group matches by recruiter and pick the most urgent frequency bucket. */
export function groupMatchesByRecruiter(matches: MatchedTalentSearch[]): Map<
  string,
  { searchIds: string[]; frequencyBucket: 'immediate' | 'daily' | 'weekly'; names: string[] }
> {
  const byRecruiter = new Map<
    string,
    { searchIds: string[]; frequencyBucket: 'immediate' | 'daily' | 'weekly'; names: string[] }
  >();

  const rank = (f: TalentAlertFrequency): number => {
    if (f === 'immediate') return 3;
    if (f === 'daily') return 2;
    if (f === 'weekly') return 1;
    return 0;
  };

  for (const match of matches) {
    if (match.frequency === 'never') continue;
    const existing = byRecruiter.get(match.recruiterId);
    const bucket =
      match.frequency === 'immediate'
        ? 'immediate'
        : match.frequency === 'weekly'
          ? 'weekly'
          : 'daily';

    if (!existing) {
      byRecruiter.set(match.recruiterId, {
        searchIds: [match.searchId],
        frequencyBucket: bucket,
        names: [match.name],
      });
      continue;
    }

    if (!existing.searchIds.includes(match.searchId)) {
      existing.searchIds.push(match.searchId);
      existing.names.push(match.name);
    }
    if (rank(match.frequency) > rank(existing.frequencyBucket)) {
      existing.frequencyBucket = bucket;
    }
  }

  return byRecruiter;
}
