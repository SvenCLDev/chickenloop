import type { Document } from 'mongoose';
import type { ICV } from '@/models/CV';
import CV from '@/models/CV';

/**
 * Reload CV from DB and send pending manager reference emails.
 * Uses a fresh document so new seasonalExperience subdocuments have stable _id values.
 */
export async function processReferenceVerificationRequestsForCvId(
  cvId: unknown
): Promise<(Document & ICV) | null> {
  const freshCv = await CV.findById(cvId);
  if (!freshCv || freshCv.profileSchemaVersion !== 2) {
    return freshCv as (Document & ICV) | null;
  }

  const { processReferenceVerificationRequests } = await import(
    '@/lib/talentNetwork/processReferenceRequests'
  );
  await processReferenceVerificationRequests(freshCv as Document & ICV);
  return freshCv as Document & ICV;
}
