import connectDB from '@/lib/db';
import User from '@/models/User';
import CV from '@/models/CV';
import TalentAlertEvent from '@/models/TalentAlertEvent';
import type { Availability } from '@/lib/domainTypes';

const AVAILABLE_SOON_FROM = new Set(['not_available', 'seasonal', '']);

export function shouldNotifyAvailabilityTransition(
  previous: string | undefined | null,
  next: string | undefined | null,
  prefs: { notifyWhenAvailableNow?: boolean; notifyWhenAvailableSoon?: boolean }
): 'available_now' | 'available_soon' | null {
  if (!next || previous === next) return null;

  if (next === 'available_now' && prefs.notifyWhenAvailableNow !== false) {
    return 'available_now';
  }

  if (
    next === 'available_soon' &&
    prefs.notifyWhenAvailableSoon === true &&
    AVAILABLE_SOON_FROM.has(previous || '')
  ) {
    return 'available_soon';
  }

  return null;
}

/**
 * Detect availability change and enqueue favourite alert events for recruiters.
 */
export async function onCvAvailabilityChanged(
  cvId: string,
  previous: Availability | string | undefined | null,
  next: Availability | string | undefined | null
): Promise<{ eventsCreated: number; immediateRecruiterIds: string[] }> {
  if (!next || previous === next) {
    return { eventsCreated: 0, immediateRecruiterIds: [] };
  }

  await connectDB();
  const cv = await CV.findById(cvId).select('published').lean();
  if (!cv || (cv as { published?: boolean }).published === false) {
    return { eventsCreated: 0, immediateRecruiterIds: [] };
  }

  const recruiters = await User.find({
    role: { $in: ['recruiter', 'admin'] },
    favouriteCandidates: cvId,
  })
    .select('_id favouriteTalentAlertPrefs')
    .lean();

  let eventsCreated = 0;
  const immediateRecruiterIds: string[] = [];
  const day = new Date().toISOString().slice(0, 10);

  for (const recruiter of recruiters) {
    const prefsList =
      (recruiter as { favouriteTalentAlertPrefs?: Array<{
        cvId: { toString(): string };
        notifyWhenAvailableNow?: boolean;
        notifyWhenAvailableSoon?: boolean;
      }> }).favouriteTalentAlertPrefs || [];
    const prefs =
      prefsList.find((p) => String(p.cvId) === String(cvId)) || {
        notifyWhenAvailableNow: true,
        notifyWhenAvailableSoon: false,
      };

    const kind = shouldNotifyAvailabilityTransition(previous, next, prefs);
    if (!kind) continue;

    const transitionId = `${previous || 'none'}_${next}`;
    const dedupeKey = `fav_avail:${recruiter._id}:${cvId}:${next}:${transitionId}:${day}`;

    try {
      await TalentAlertEvent.create({
        recruiterId: recruiter._id,
        candidateId: cvId,
        eventType: 'favourite_became_available',
        talentSavedSearchIds: [],
        previousAvailability: previous || undefined,
        newAvailability: next,
        dedupeKey,
        status: 'pending',
        frequencyBucket: 'immediate',
        attempts: 0,
      });
      eventsCreated += 1;
      immediateRecruiterIds.push(String(recruiter._id));
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code !== 11000) {
        console.error('[onCvAvailabilityChanged]', err);
      }
    }
  }

  return { eventsCreated, immediateRecruiterIds };
}
