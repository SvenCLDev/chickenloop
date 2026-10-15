'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { jobsApi } from '@/lib/api';
import { TALENT_LIST_PATH } from '@/lib/talentRoutes';

export type RecruiterJobTalentMatchRow = {
  jobId: string;
  title: string;
  matchCount: number;
  matchUrl: string;
};

/**
 * Compact list of published jobs with talent match counts and deep links to /talent.
 * Loaded independently of My Job Postings so the jobs table stays snappy.
 */
export default function RecruiterJobTalentMatches() {
  const [matches, setMatches] = useState<RecruiterJobTalentMatchRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await jobsApi.getTalentMatches();
        if (cancelled) return;
        const rows = Array.isArray(data?.matches) ? data.matches : [];
        setMatches(rows);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setMatches([]);
        setError(err instanceof Error ? err.message : 'Could not load talent matches');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const loading = matches === null;

  return (
    <section className="mb-8" aria-labelledby="recruiter-talent-matches-heading">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id="recruiter-talent-matches-heading"
            className="text-2xl font-bold text-gray-900"
          >
            Matching talent for your jobs
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Candidates in our talent database who fit your published roles. Open a list to
            browse and contact them.
          </p>
        </div>
        <Link
          href={TALENT_LIST_PATH}
          className="text-sm font-semibold text-blue-600 hover:underline"
        >
          Browse all talent →
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <ul className="divide-y divide-gray-100" aria-busy="true" aria-label="Loading matches">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="h-4 w-2/5 max-w-xs animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
              </li>
            ))}
          </ul>
        ) : error ? (
          <p className="px-4 py-6 text-sm text-red-700">{error}</p>
        ) : matches.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-600">
            Publish a job to see matching candidates here.{' '}
            <Link href="/recruiter/jobs/new" className="font-semibold text-blue-600 hover:underline">
              Post a job
            </Link>
            {' · '}
            <Link href={TALENT_LIST_PATH} className="font-semibold text-blue-600 hover:underline">
              Browse talent
            </Link>
          </p>
        ) : (
          <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
            {matches.map((row) => (
              <li
                key={row.jobId}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900" title={row.title}>
                  {row.title}
                </span>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm tabular-nums text-gray-600">
                    {row.matchCount} {row.matchCount === 1 ? 'match' : 'matches'}
                  </span>
                  <Link
                    href={row.matchUrl}
                    className="text-sm font-semibold text-blue-600 hover:underline"
                  >
                    View matches →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
