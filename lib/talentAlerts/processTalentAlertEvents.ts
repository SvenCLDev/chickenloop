import connectDB from '@/lib/db';
import User from '@/models/User';
import CV from '@/models/CV';
import TalentAlertEvent from '@/models/TalentAlertEvent';
import TalentSavedSearch from '@/models/TalentSavedSearch';
import { sendEmail, EmailCategory } from '@/lib/email';
import {
  favouriteAvailabilityAlertEmail,
  talentSearchAlertEmail,
} from '@/lib/email/templates/talentSearchAlert';
import { getDisplayHeadline } from '@/lib/talentNetwork/profileHeadline';
import { talentProfilePath } from '@/lib/talentRoutes';
import { trackTalentAlertAnalytics } from '@/lib/talentAlerts/analytics';
import {
  enqueueSavedSearchMatchesForCv,
  triggerImmediateTalentAlertProcessing,
} from '@/lib/talentAlerts/enqueueTalentAlertEvents';

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  ).replace(/\/$/, '');
}

function candidateEmailCard(
  cv: Record<string, unknown>,
  matchedSearches?: string[]
) {
  const headline = getDisplayHeadline({
    profileHeadline: cv.profileHeadline as string | undefined,
    experienceAndSkill: cv.experienceAndSkill as string[] | undefined,
    lookingForWorkInAreas: cv.lookingForWorkInAreas as string[] | undefined,
  });
  return {
    headline: headline || (cv.fullName as string) || 'Talent profile',
    availability: cv.availability as string | undefined,
    sports: (cv.experienceAndSkill as string[] | undefined)?.slice(0, 4),
    locationSnippet: typeof cv.address === 'string' ? cv.address.slice(0, 80) : undefined,
    profileUrl: `${appBaseUrl()}${talentProfilePath(String(cv._id))}?ref=talent_alert`,
    matchedSearches,
  };
}

async function markEvents(
  ids: string[],
  status: 'sent' | 'suppressed' | 'failed'
) {
  await TalentAlertEvent.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        status,
        emailSentAt: status === 'sent' ? new Date() : undefined,
      },
      $inc: { attempts: 1 },
    }
  );
}

/**
 * Process pending immediate events for one CV / optional recruiters.
 */
export async function processImmediateTalentAlertEvents(options?: {
  cvId?: string;
  recruiterIds?: string[];
}): Promise<{ sent: number; suppressed: number; failed: number }> {
  await connectDB();
  const query: Record<string, unknown> = {
    status: 'pending',
    frequencyBucket: 'immediate',
  };
  if (options?.cvId) query.candidateId = options.cvId;
  if (options?.recruiterIds?.length) {
    query.recruiterId = { $in: options.recruiterIds };
  }

  const events = await TalentAlertEvent.find(query).limit(100).lean();
  let sent = 0;
  let suppressed = 0;
  let failed = 0;

  const byRecruiter = new Map<string, typeof events>();
  for (const event of events) {
    const key = String(event.recruiterId);
    const list = byRecruiter.get(key) || [];
    list.push(event);
    byRecruiter.set(key, list);
  }

  for (const [recruiterId, recruiterEvents] of byRecruiter.entries()) {
    const recruiter = await User.findById(recruiterId).select('email name role').lean();
    if (!recruiter || !['recruiter', 'admin'].includes((recruiter as { role?: string }).role || '')) {
      await markEvents(
        recruiterEvents.map((e) => String(e._id)),
        'suppressed'
      );
      suppressed += recruiterEvents.length;
      continue;
    }

    const searchMatchEvents = recruiterEvents.filter(
      (e) => e.eventType === 'saved_search_match'
    );
    const favEvents = recruiterEvents.filter(
      (e) => e.eventType === 'favourite_became_available'
    );

    if (searchMatchEvents.length > 0) {
      const result = await sendSavedSearchEmail(
        recruiter as { _id: unknown; email: string; name?: string },
        searchMatchEvents as Array<Record<string, unknown>>,
        false
      );
      if (result === 'sent') sent += 1;
      else if (result === 'suppressed') suppressed += 1;
      else failed += 1;
    }

    for (const fav of favEvents) {
      const result = await sendFavouriteEmail(
        recruiter as { _id: unknown; email: string; name?: string },
        fav as Record<string, unknown>
      );
      if (result === 'sent') sent += 1;
      else if (result === 'suppressed') suppressed += 1;
      else failed += 1;
    }
  }

  return { sent, suppressed, failed };
}

/**
 * Daily/weekly digest cron processing.
 */
export async function processTalentAlertDigests(): Promise<{
  sent: number;
  suppressed: number;
  failed: number;
}> {
  await connectDB();
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const oneWeekMs = 7 * oneDayMs;

  // Safety: process stale immediate pending events too
  await processImmediateTalentAlertEvents();

  const pending = await TalentAlertEvent.find({
    status: 'pending',
    eventType: 'saved_search_match',
    frequencyBucket: { $in: ['daily', 'weekly'] },
  })
    .limit(500)
    .lean();

  const byRecruiter = new Map<string, typeof pending>();
  for (const event of pending) {
    const key = String(event.recruiterId);
    const list = byRecruiter.get(key) || [];
    list.push(event);
    byRecruiter.set(key, list);
  }

  let sent = 0;
  let suppressed = 0;
  let failed = 0;
  const emailedThisRun = new Set<string>();

  for (const [recruiterId, events] of byRecruiter.entries()) {
    const searches = await TalentSavedSearch.find({
      _id: { $in: events.flatMap((e) => e.talentSavedSearchIds || []) },
      active: true,
      frequency: { $in: ['daily', 'weekly'] },
    }).lean();

    if (searches.length === 0) {
      await markEvents(
        events.map((e) => String(e._id)),
        'suppressed'
      );
      suppressed += events.length;
      continue;
    }

    const dueSearchIds = new Set<string>();
    for (const search of searches) {
      const last = search.lastSentAt ? new Date(search.lastSentAt).getTime() : 0;
      if (search.frequency === 'daily' && (!last || now - last >= oneDayMs)) {
        dueSearchIds.add(String(search._id));
      }
      if (search.frequency === 'weekly' && (!last || now - last >= oneWeekMs)) {
        dueSearchIds.add(String(search._id));
      }
    }

    const dueEvents = events.filter((e) =>
      (e.talentSavedSearchIds || []).some((id) => dueSearchIds.has(String(id)))
    );
    if (dueEvents.length === 0) continue;

    if (emailedThisRun.has(recruiterId)) {
      continue; // 1 digest email per recruiter per cron run
    }

    const recruiter = await User.findById(recruiterId).select('email name role').lean();
    if (!recruiter || !['recruiter', 'admin'].includes((recruiter as { role?: string }).role || '')) {
      await markEvents(
        dueEvents.map((e) => String(e._id)),
        'suppressed'
      );
      suppressed += dueEvents.length;
      continue;
    }

    const result = await sendSavedSearchEmail(
      recruiter as { _id: unknown; email: string; name?: string },
      dueEvents as Array<Record<string, unknown>>,
      true
    );
    emailedThisRun.add(recruiterId);

    if (result === 'sent') {
      sent += 1;
      await TalentSavedSearch.updateMany(
        { _id: { $in: Array.from(dueSearchIds) } },
        { $set: { lastSentAt: new Date() } }
      );
    } else if (result === 'suppressed') suppressed += 1;
    else failed += 1;
  }

  return { sent, suppressed, failed };
}

async function sendSavedSearchEmail(
  recruiter: { _id: unknown; email: string; name?: string },
  events: Array<Record<string, unknown>>,
  isDigest: boolean
): Promise<'sent' | 'suppressed' | 'failed'> {
  const eventIds = events.map((e) => String(e._id));
  const cvIds = [...new Set(events.map((e) => String(e.candidateId)))];
  const cvs = await CV.find({
    _id: { $in: cvIds },
    published: { $ne: false },
  })
    .select(
      'fullName profileHeadline experienceAndSkill lookingForWorkInAreas availability address'
    )
    .lean();

  if (cvs.length === 0) {
    await markEvents(eventIds, 'suppressed');
    return 'suppressed';
  }

  const searchIds = [
    ...new Set(
      events.flatMap((e) =>
        ((e.talentSavedSearchIds as unknown[]) || []).map((id) => String(id))
      )
    ),
  ];
  const searches = await TalentSavedSearch.find({ _id: { $in: searchIds } })
    .select('name')
    .lean();
  const searchNameById = new Map(searches.map((s) => [String(s._id), s.name]));

  const cards = cvs.map((cv) => {
    const related = events.filter((e) => String(e.candidateId) === String(cv._id));
    const names = related
      .flatMap((e) => (e.talentSavedSearchIds as unknown[]) || [])
      .map((id) => searchNameById.get(String(id)))
      .filter(Boolean) as string[];
    return candidateEmailCard(cv as Record<string, unknown>, [...new Set(names)]);
  });

  const template = talentSearchAlertEmail({
    recruiterName: recruiter.name,
    candidates: cards,
    dashboardUrl: `${appBaseUrl()}/recruiter`,
    isDigest,
  });

  try {
    const result = await sendEmail({
      to: recruiter.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      category: EmailCategory.USER_NOTIFICATION,
      eventType: 'talent_alert',
      userId: String(recruiter._id),
      unsubscribePreferenceKey: 'talentAlerts',
      tags: [
        { name: 'type', value: 'talent_alert' },
        { name: 'digest', value: isDigest ? 'true' : 'false' },
      ],
    });

    // sendEmail returns success even when suppressed (no messageId)
    if (!result.success || !result.messageId) {
      await markEvents(eventIds, result.success ? 'suppressed' : 'failed');
      return result.success ? 'suppressed' : 'failed';
    }

    await markEvents(eventIds, 'sent');
    await TalentSavedSearch.updateMany(
      { _id: { $in: searchIds } },
      { $set: { lastSentAt: new Date() } }
    );
    trackTalentAlertAnalytics('talent_alert_email_sent', {
      recruiterId: String(recruiter._id),
      candidateCount: cards.length,
      isDigest,
    });
    return 'sent';
  } catch (err) {
    console.error('[sendSavedSearchEmail]', err);
    await markEvents(eventIds, 'failed');
    trackTalentAlertAnalytics('talent_alert_email_failed', {
      recruiterId: String(recruiter._id),
    });
    return 'failed';
  }
}

async function sendFavouriteEmail(
  recruiter: { _id: unknown; email: string; name?: string },
  event: Record<string, unknown>
): Promise<'sent' | 'suppressed' | 'failed'> {
  const eventId = String(event._id);
  const cv = await CV.findOne({
    _id: event.candidateId,
    published: { $ne: false },
  })
    .select(
      'fullName profileHeadline experienceAndSkill lookingForWorkInAreas availability address'
    )
    .lean();

  const stillFav = await User.findOne({
    _id: recruiter._id,
    favouriteCandidates: event.candidateId,
  })
    .select('_id')
    .lean();

  if (!cv || !stillFav) {
    await markEvents([eventId], 'suppressed');
    return 'suppressed';
  }

  const card = candidateEmailCard(cv as Record<string, unknown>);
  const template = favouriteAvailabilityAlertEmail({
    recruiterName: recruiter.name,
    headline: card.headline,
    previousAvailability: event.previousAvailability as string | undefined,
    newAvailability: (event.newAvailability as string) || 'available_now',
    profileUrl: card.profileUrl,
    dashboardUrl: `${appBaseUrl()}/recruiter`,
  });

  try {
    const result = await sendEmail({
      to: recruiter.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      category: EmailCategory.USER_NOTIFICATION,
      eventType: 'talent_alert_favourite',
      userId: String(recruiter._id),
      unsubscribePreferenceKey: 'talentAlerts',
      tags: [{ name: 'type', value: 'talent_alert_favourite' }],
    });

    if (!result.success || !result.messageId) {
      await markEvents([eventId], result.success ? 'suppressed' : 'failed');
      return result.success ? 'suppressed' : 'failed';
    }

    await markEvents([eventId], 'sent');
    trackTalentAlertAnalytics('favourite_availability_alert_sent', {
      recruiterId: String(recruiter._id),
      candidateId: String(event.candidateId),
    });
    return 'sent';
  } catch (err) {
    console.error('[sendFavouriteEmail]', err);
    await markEvents([eventId], 'failed');
    trackTalentAlertAnalytics('talent_alert_email_failed', {
      recruiterId: String(recruiter._id),
      kind: 'favourite',
    });
    return 'failed';
  }
}

/** Internal entry: enqueue matches for a CV then optionally process immediate. */
export async function handleTalentAlertInternalAction(body: {
  action?: string;
  cvId?: string;
  recruiterIds?: string[];
}): Promise<Record<string, unknown>> {
  if (body.action === 'enqueue' && body.cvId) {
    const result = await enqueueSavedSearchMatchesForCv(body.cvId);
    if (result.immediateRecruiterIds.length > 0) {
      triggerImmediateTalentAlertProcessing(body.cvId, result.immediateRecruiterIds);
      const processed = await processImmediateTalentAlertEvents({
        cvId: body.cvId,
        recruiterIds: result.immediateRecruiterIds,
      });
      return { ...result, processed };
    }
    return result;
  }

  if (body.action === 'process_immediate') {
    return processImmediateTalentAlertEvents({
      cvId: body.cvId,
      recruiterIds: body.recruiterIds,
    });
  }

  if (body.action === 'process_digests') {
    return processTalentAlertDigests();
  }

  return { error: 'Unknown action' };
}
