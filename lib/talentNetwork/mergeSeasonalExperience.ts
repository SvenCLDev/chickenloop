import mongoose from 'mongoose';
import type { SeasonalExperience } from './types';

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

export function isMongoObjectId(value: unknown): value is string {
  return typeof value === 'string' && OBJECT_ID_RE.test(value);
}

export function parseMongoObjectId(value: unknown): mongoose.Types.ObjectId | undefined {
  if (!isMongoObjectId(value)) return undefined;
  return new mongoose.Types.ObjectId(value);
}

export function mergeSeasonalExperienceForSave(
  existing: SeasonalExperience[] | undefined,
  incoming: SeasonalExperience[]
): SeasonalExperience[] {
  return incoming.map((entry) => {
    const explicitId = parseMongoObjectId(entry._id);

    const fingerprintMatch = existing?.find(
      (e) =>
        e.schoolName === entry.schoolName &&
        e.role === entry.role &&
        e.startMonth === entry.startMonth &&
        e.startYear === entry.startYear
    );

    const preservedId = explicitId ?? fingerprintMatch?._id;
    if (!preservedId) {
      return {
        ...entry,
        _id: new mongoose.Types.ObjectId(),
      };
    }

    return {
      ...fingerprintMatch,
      ...entry,
      _id: preservedId,
      verificationStatus:
        entry.verificationStatus ??
        fingerprintMatch?.verificationStatus ??
        'self_reported',
      referenceTokenId: fingerprintMatch?.referenceTokenId ?? entry.referenceTokenId,
      lastReferenceEmailSentAt:
        fingerprintMatch?.lastReferenceEmailSentAt ?? entry.lastReferenceEmailSentAt,
      workConfirmed: entry.workConfirmed ?? fingerprintMatch?.workConfirmed,
      rehireAnswer: entry.rehireAnswer ?? fingerprintMatch?.rehireAnswer,
    };
  });
}

export function findSeasonalExperienceForToken(
  seasonalExperience: SeasonalExperience[] | undefined,
  token: {
    _id: mongoose.Types.ObjectId | string;
    experienceEntryId: string;
    schoolName: string;
    managerEmail: string;
    seasonLabel?: string;
  }
): SeasonalExperience | undefined {
  if (!seasonalExperience?.length) return undefined;

  const byId = seasonalExperience.find(
    (e) => e._id && String(e._id) === token.experienceEntryId
  );
  if (byId) return byId;

  const byTokenRef = seasonalExperience.find(
    (e) => e.referenceTokenId && String(e.referenceTokenId) === String(token._id)
  );
  if (byTokenRef) return byTokenRef;

  const email = token.managerEmail.toLowerCase();
  return seasonalExperience.find(
    (e) =>
      e.schoolName === token.schoolName &&
      (e.referenceEmail?.toLowerCase() === email ||
        e.verificationStatus === 'reference_requested')
  );
}
