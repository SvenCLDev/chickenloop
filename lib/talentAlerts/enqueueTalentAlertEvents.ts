import connectDB from '@/lib/db';
import CV from '@/models/CV';
import TalentAlertEvent from '@/models/TalentAlertEvent';
import {
  findMatchingTalentSavedSearches,
  groupMatchesByRecruiter,
} from '@/lib/talentAlerts/matchCvToSavedSearches';

function utcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Mark first searchable time once, then enqueue saved-search match events.
 * Fire-and-forget safe; does not send email.
 */
export async function enqueueSavedSearchMatchesForCv(cvId: string): Promise<{
  eventsCreated: number;
  immediateRecruiterIds: string[];
}> {
  await connectDB();

  const cv = await CV.findById(cvId);
  if (!cv || cv.published === false) {
    return { eventsCreated: 0, immediateRecruiterIds: [] };
  }

  if (!(cv as { firstSearchableAt?: Date }).firstSearchableAt) {
    (cv as { firstSearchableAt?: Date }).firstSearchableAt = new Date();
    await cv.save();
  }

  const matches = await findMatchingTalentSavedSearches(cvId);
  const grouped = groupMatchesByRecruiter(matches);
  const day = utcDayKey();
  let eventsCreated = 0;
  const immediateRecruiterIds: string[] = [];

  for (const [recruiterId, group] of grouped.entries()) {
    const dedupeKey = `saved_search_match:${recruiterId}:${cvId}:${day}`;
    try {
      await TalentAlertEvent.create({
        recruiterId,
        candidateId: cvId,
        eventType: 'saved_search_match',
        talentSavedSearchIds: group.searchIds,
        dedupeKey,
        status: 'pending',
        frequencyBucket: group.frequencyBucket,
        attempts: 0,
      });
      eventsCreated += 1;
      if (group.frequencyBucket === 'immediate') {
        immediateRecruiterIds.push(recruiterId);
      }
    } catch (err: unknown) {
      // Duplicate key = already queued today
      const code = (err as { code?: number })?.code;
      if (code !== 11000) {
        console.error('[enqueueSavedSearchMatchesForCv]', err);
      } else {
        // Merge search ids onto existing pending event
        const update: Record<string, unknown> = {
          $addToSet: { talentSavedSearchIds: { $each: group.searchIds } },
        };
        if (group.frequencyBucket === 'immediate') {
          update.$set = { frequencyBucket: 'immediate' };
        }
        await TalentAlertEvent.updateOne({ dedupeKey, status: 'pending' }, update);
        if (group.frequencyBucket === 'immediate') {
          immediateRecruiterIds.push(recruiterId);
        }
      }
    }
  }

  return { eventsCreated, immediateRecruiterIds };
}

/**
 * Non-blocking trigger for profile publish/create paths.
 */
export function triggerTalentAlertEnqueueAsync(cvId: string): void {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  if (!base) {
    // Fallback: process inline without awaiting caller
    void enqueueSavedSearchMatchesForCv(cvId)
      .then((result) => {
        if (result.immediateRecruiterIds.length > 0) {
          void triggerImmediateTalentAlertProcessing(cvId, result.immediateRecruiterIds);
        }
      })
      .catch((err) => console.error('[triggerTalentAlertEnqueueAsync]', err));
    return;
  }

  const secret = process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET || '';
  void fetch(`${base.replace(/\/$/, '')}/api/internal/process-talent-alert-events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({ action: 'enqueue', cvId }),
  }).catch((err) => console.error('[triggerTalentAlertEnqueueAsync] fetch', err));
}

export function triggerImmediateTalentAlertProcessing(
  cvId: string,
  recruiterIds: string[]
): void {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  if (!base) return;
  const secret = process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET || '';
  void fetch(`${base.replace(/\/$/, '')}/api/internal/process-talent-alert-events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({
      action: 'process_immediate',
      cvId,
      recruiterIds,
    }),
  }).catch((err) => console.error('[triggerImmediateTalentAlertProcessing]', err));
}
