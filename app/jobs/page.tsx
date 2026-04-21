import Navbar from '../components/Navbar';
import JobList from './JobList';
import { getJobs } from '@/lib/jobs';
import type { Metadata } from 'next';

const JOBS_PER_PAGE = 20;

type SearchParamValue = string | string[] | undefined;

function readNumericParam(value: SearchParamValue, fallback: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.floor(parsed);
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, SearchParamValue>> | Record<string, SearchParamValue>;
}) {
  const resolvedParams = (await Promise.resolve(searchParams)) || {};
  const page = readNumericParam(resolvedParams.page, 1);

  const { jobs: initialJobs, hasMore } = await getJobs({ page, limit: JOBS_PER_PAGE });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
          Latest Jobs
        </h1>
        <JobList initialJobs={initialJobs} initialPage={page} hasMore={hasMore} />

        {/* SEO crawlable pagination links */}
        <div className="hidden">
          {page > 1 && (
            <a href={`/jobs?page=${page - 1}`} rel="prev">
              Previous page
            </a>
          )}
          {hasMore && (
            <a href={`/jobs?page=${page + 1}`} rel="next">
              Next page
            </a>
          )}
        </div>
      </main>
    </div>
  );
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<Record<string, SearchParamValue>> | Record<string, SearchParamValue>;
}): Promise<Metadata> {
  const resolvedParams = (await Promise.resolve(searchParams)) || {};
  const page = readNumericParam(resolvedParams.page, 1);

  return {
    alternates: {
      canonical: `/jobs?page=${page}`,
    },
  };
}
