import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import { requireRole } from '@/lib/auth';
import {
  buildJobTalentMatchUrl,
  countCvsMatchingJob,
  mapWithConcurrency,
  type JobTalentMatchInput,
} from '@/lib/jobTalentMatch';

const MATCH_COUNT_CONCURRENCY = 8;

export type RecruiterJobTalentMatch = {
  jobId: string;
  title: string;
  matchCount: number;
  matchUrl: string;
};

/**
 * GET — published jobs for the current recruiter with talent match counts + /talent deep-links.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['recruiter', 'admin']);
    await connectDB();

    const jobs = await Job.find({
      recruiter: user.userId,
      published: true,
    })
      .select('_id title sports occupationalAreas languages country')
      .lean();

    const matchInputs: JobTalentMatchInput[] = jobs.map((job) => ({
      sports: job.sports,
      occupationalAreas: job.occupationalAreas,
      languages: job.languages,
      country: job.country,
    }));

    const matchCounts = await mapWithConcurrency(
      matchInputs,
      MATCH_COUNT_CONCURRENCY,
      (input) => countCvsMatchingJob(input)
    );

    const matches: RecruiterJobTalentMatch[] = jobs
      .map((job, index) => {
        const matchInput = matchInputs[index];
        return {
          jobId: String(job._id),
          title: typeof job.title === 'string' ? job.title : 'Untitled job',
          matchCount: matchCounts[index] ?? 0,
          matchUrl: buildJobTalentMatchUrl(matchInput),
        };
      })
      .sort((a, b) => b.matchCount - a.matchCount || a.title.localeCompare(b.title));

    return NextResponse.json({ matches }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'PASSWORD_RESET_REQUIRED') {
      return NextResponse.json({ error: 'PASSWORD_RESET_REQUIRED' }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'COMPANY_PROFILE_INCOMPLETE') {
      return NextResponse.json({ error: 'COMPANY_PROFILE_INCOMPLETE' }, { status: 403 });
    }
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}
