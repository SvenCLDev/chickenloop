import connectDB from '@/lib/db';
import Job from '@/models/Job';
import User from '@/models/User';
import {
  buildJobTalentMatchUrl,
  countCvsMatchingJob,
  mapWithConcurrency,
} from '@/lib/jobTalentMatch';
import { sendTalentMatchEmail } from '@/lib/email/sendTalentMatchEmail';
import {
  TALENT_MATCH_EMAIL_CATCH_WINDOW_MS,
  TALENT_MATCH_EMAIL_MIN_MATCHES,
} from '@/lib/talentMatchEmailSchedule';

const MATCH_COUNT_CONCURRENCY = 8;
const BATCH_LIMIT = 100;

export type TalentMatchEmailProcessResult = {
  scanned: number;
  sent: number;
  skippedLowMatches: number;
  skippedNoRecruiter: number;
  suppressedOrFailed: number;
  errors: string[];
};

/**
 * Process published jobs whose talent-match email is due.
 * Clears dueAt after send or when matchCount is too low.
 */
export async function processTalentMatchEmails(
  now: Date = new Date()
): Promise<TalentMatchEmailProcessResult> {
  await connectDB();

  const windowStart = new Date(now.getTime() - TALENT_MATCH_EMAIL_CATCH_WINDOW_MS);

  const jobs = await Job.find({
    published: true,
    talentMatchEmailDueAt: { $ne: null, $lte: now, $gte: windowStart },
  })
    .select(
      '_id title recruiter sports occupationalAreas languages country talentMatchEmailDueAt'
    )
    .sort({ talentMatchEmailDueAt: 1 })
    .limit(BATCH_LIMIT)
    .lean();

  const result: TalentMatchEmailProcessResult = {
    scanned: jobs.length,
    sent: 0,
    skippedLowMatches: 0,
    skippedNoRecruiter: 0,
    suppressedOrFailed: 0,
    errors: [],
  };

  if (jobs.length === 0) {
    return result;
  }

  const matchCounts = await mapWithConcurrency(
    jobs,
    MATCH_COUNT_CONCURRENCY,
    (job) =>
      countCvsMatchingJob({
        sports: job.sports,
        occupationalAreas: job.occupationalAreas,
        languages: job.languages,
        country: job.country,
      })
  );

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const jobId = String(job._id);
    const matchCount = matchCounts[i] ?? 0;

    try {
      if (matchCount < TALENT_MATCH_EMAIL_MIN_MATCHES) {
        await Job.updateOne(
          { _id: job._id },
          { $set: { talentMatchEmailDueAt: null } }
        );
        result.skippedLowMatches += 1;
        continue;
      }

      const recruiter = await User.findById(job.recruiter)
        .select('email name role')
        .lean();

      if (!recruiter?.email || recruiter.role !== 'recruiter') {
        await Job.updateOne(
          { _id: job._id },
          { $set: { talentMatchEmailDueAt: null } }
        );
        result.skippedNoRecruiter += 1;
        continue;
      }

      const matchUrl = buildJobTalentMatchUrl({
        sports: job.sports,
        occupationalAreas: job.occupationalAreas,
        languages: job.languages,
        country: job.country,
      });

      const sendResult = await sendTalentMatchEmail({
        recruiterEmail: recruiter.email,
        recruiterName: recruiter.name ?? undefined,
        recruiterUserId: String(job.recruiter),
        jobTitle: typeof job.title === 'string' ? job.title : 'Untitled job',
        matchCount,
        matchUrl,
      });

      if (!sendResult.success) {
        result.suppressedOrFailed += 1;
        result.errors.push(
          `job ${jobId}: ${sendResult.error || 'send failed'}`
        );
        // Leave dueAt so a later cron can retry hard failures
        continue;
      }

      // Prefs suppress returns success without messageId — still clear dueAt
      await Job.updateOne(
        { _id: job._id },
        {
          $set: {
            talentMatchEmailDueAt: null,
            lastTalentMatchEmailAt: now,
          },
        }
      );

      if (sendResult.messageId) {
        result.sent += 1;
      } else {
        result.suppressedOrFailed += 1;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`job ${jobId}: ${msg}`);
      result.suppressedOrFailed += 1;
    }
  }

  return result;
}
