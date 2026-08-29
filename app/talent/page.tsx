import { Suspense } from 'react';
import Navbar from '../components/Navbar';
import CandidateList from './CandidateList';
import { parseCandidateSearchParams } from '@/lib/candidateSearchParams';

type SearchParamValue = string | string[] | undefined;

function readSearchParams(
  resolvedParams: Record<string, SearchParamValue>
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(resolvedParams)) {
    if (Array.isArray(value)) {
      if (value[0]) params.set(key, String(value[0]));
    } else if (value) {
      params.set(key, String(value));
    }
  }
  return params;
}

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, SearchParamValue>> | Record<string, SearchParamValue>;
}) {
  const resolvedParams = (await Promise.resolve(searchParams)) || {};
  const initialFilters = parseCandidateSearchParams(readSearchParams(resolvedParams));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-24">
              <div className="text-xl text-gray-600">Loading...</div>
            </div>
          }
        >
          <CandidateList initialFilters={initialFilters} />
        </Suspense>
      </main>
    </div>
  );
}
