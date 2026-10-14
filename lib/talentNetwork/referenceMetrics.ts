import connectDB from '@/lib/db';
import ReferenceVerificationToken from '@/models/ReferenceVerificationToken';
import CV from '@/models/CV';

/**
 * Structured reference funnel events for logs / observability.
 * Never log confirm tokens or full manager email bodies.
 *
 * Do not Cc the seeker on manager emails — confirm links are bearer tokens.
 */
export type ReferenceMetricEvent =
  | 'reference_request_sent'
  | 'reference_reminder_sent_manager'
  | 'reference_fyi_sent_seeker'
  | 'reference_confirm_page_view'
  | 'reference_confirmed'
  | 'reference_disputed'
  | 'reference_expired'
  | 'reference_bounced';

export function logReferenceMetric(
  event: ReferenceMetricEvent,
  data: Record<string, unknown> = {}
): void {
  console.info(
    JSON.stringify({
      type: 'reference_metric',
      event,
      ...data,
      ts: Date.now(),
    })
  );
}

export type ReferenceFunnelStats = {
  tokens: {
    total: number;
    pending: number;
    respondedConfirmed: number;
    respondedDisputed: number;
    expiredUnanswered: number;
    bounced: number;
    withReminder: number;
  };
  experienceByStatus: Record<string, number>;
  /** Median hours from token createdAt to respondedAt (confirmed or disputed only). */
  medianHoursToResponse: number | null;
};

/**
 * Snapshot funnel counts from MongoDB for admin dashboards / post-change review.
 * Use before changing reminder cadence (Phase 4).
 */
export async function getReferenceFunnelStats(): Promise<ReferenceFunnelStats> {
  await connectDB();
  const now = new Date();

  const [
    total,
    pending,
    respondedConfirmed,
    respondedDisputed,
    expiredUnanswered,
    bounced,
    withReminder,
    responseTimes,
    experienceStatuses,
  ] = await Promise.all([
    ReferenceVerificationToken.countDocuments({}),
    ReferenceVerificationToken.countDocuments({
      respondedAt: { $exists: false },
      bouncedAt: { $exists: false },
      expiresAt: { $gt: now },
    }),
    ReferenceVerificationToken.countDocuments({
      respondedAt: { $exists: true },
      $or: [{ workConfirmed: true }, { confirmed: true }],
      workConfirmed: { $ne: false },
    }),
    ReferenceVerificationToken.countDocuments({
      respondedAt: { $exists: true },
      workConfirmed: false,
    }),
    ReferenceVerificationToken.countDocuments({
      respondedAt: { $exists: false },
      bouncedAt: { $exists: false },
      expiresAt: { $lte: now },
    }),
    ReferenceVerificationToken.countDocuments({ bouncedAt: { $exists: true } }),
    ReferenceVerificationToken.countDocuments({
      reminderSentAt: { $exists: true },
    }),
    ReferenceVerificationToken.find({
      respondedAt: { $exists: true },
      createdAt: { $exists: true },
    })
      .select('createdAt respondedAt')
      .lean(),
    CV.aggregate<{ _id: string; count: number }>([
      { $unwind: '$seasonalExperience' },
      {
        $group: {
          _id: {
            $ifNull: ['$seasonalExperience.verificationStatus', 'self_reported'],
          },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const hours: number[] = [];
  for (const row of responseTimes) {
    const created = row.createdAt ? new Date(row.createdAt).getTime() : NaN;
    const responded = row.respondedAt
      ? new Date(row.respondedAt).getTime()
      : NaN;
    if (!Number.isFinite(created) || !Number.isFinite(responded)) continue;
    hours.push((responded - created) / (1000 * 60 * 60));
  }
  hours.sort((a, b) => a - b);
  const medianHoursToResponse =
    hours.length === 0
      ? null
      : hours.length % 2 === 1
        ? hours[(hours.length - 1) / 2]
        : (hours[hours.length / 2 - 1] + hours[hours.length / 2]) / 2;

  const experienceByStatus: Record<string, number> = {};
  for (const row of experienceStatuses) {
    experienceByStatus[String(row._id)] = row.count;
  }

  return {
    tokens: {
      total,
      pending,
      respondedConfirmed,
      respondedDisputed,
      expiredUnanswered,
      bounced,
      withReminder,
    },
    experienceByStatus,
    medianHoursToResponse:
      medianHoursToResponse === null
        ? null
        : Math.round(medianHoursToResponse * 10) / 10,
  };
}
