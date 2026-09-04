import Navbar from '../components/Navbar';
import PageHeaderMarketingBanner from '@/components/marketing/PageHeaderMarketingBanner';
import JobList from './JobList';
import { getJobs, type JobListFilters } from '@/lib/jobs';
import type { Metadata } from 'next';

const JOBS_PER_PAGE = 20;

type SearchParamValue = string | string[] | undefined;

function readStringParam(value: SearchParamValue): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ? String(raw) : '';
}

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
  const initialFilters: JobListFilters = {
    keyword: readStringParam(resolvedParams.keyword),
    location: readStringParam(resolvedParams.location),
    country: readStringParam(resolvedParams.country),
    city: readStringParam(resolvedParams.city),
    category: readStringParam(resolvedParams.category),
    employmentType: readStringParam(resolvedParams.employmentType),
    activity: readStringParam(resolvedParams.activity),
    language: readStringParam(resolvedParams.language),
  };

  const {
    jobs: initialJobs,
    hasMore,
    totalCount,
    availableCountries,
    availableCities,
    availableCategories,
    availableEmploymentTypes,
    availableActivities,
    availableLanguages,
  } = await getJobs({
    page,
    limit: JOBS_PER_PAGE,
    filters: initialFilters,
  });

  const buildPageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    params.set('page', String(targetPage));
    if (initialFilters.keyword) params.set('keyword', initialFilters.keyword);
    if (initialFilters.location) params.set('location', initialFilters.location);
    if (initialFilters.country) params.set('country', initialFilters.country);
    if (initialFilters.city) params.set('city', initialFilters.city);
    if (initialFilters.category) params.set('category', initialFilters.category);
    if (initialFilters.employmentType) params.set('employmentType', initialFilters.employmentType);
    if (initialFilters.activity) params.set('activity', initialFilters.activity);
    if (initialFilters.language) params.set('language', initialFilters.language);
    return `/jobs?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <PageHeaderMarketingBanner placementKey="jobs-listing-page" />
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
          Latest Jobs
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          <a href="/insights" className="text-blue-600 hover:underline">
            Job market insights
          </a>
          {' — live counts by country, sport, and role type.'}
        </p>
        <JobList
          initialJobs={initialJobs}
          initialCountries={availableCountries}
          initialCities={availableCities}
          initialCategories={availableCategories}
          initialEmploymentTypes={availableEmploymentTypes}
          initialActivities={availableActivities}
          initialLanguages={availableLanguages}
          initialPage={page}
          hasMore={hasMore}
          initialTotalCount={totalCount}
          initialFilters={initialFilters}
        />

        {/* SEO crawlable pagination links */}
        <div className="hidden">
          {page > 1 && (
            <a href={buildPageHref(page - 1)} rel="prev">
              Previous page
            </a>
          )}
          {hasMore && (
            <a href={buildPageHref(page + 1)} rel="next">
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
  const filters: JobListFilters = {
    keyword: readStringParam(resolvedParams.keyword),
    location: readStringParam(resolvedParams.location),
    country: readStringParam(resolvedParams.country),
    city: readStringParam(resolvedParams.city),
    category: readStringParam(resolvedParams.category),
    employmentType: readStringParam(resolvedParams.employmentType),
    activity: readStringParam(resolvedParams.activity),
    language: readStringParam(resolvedParams.language),
  };

  const params = new URLSearchParams();
  params.set('page', String(page));
  if (filters.keyword) params.set('keyword', filters.keyword);
  if (filters.location) params.set('location', filters.location);
  if (filters.country) params.set('country', filters.country);
  if (filters.city) params.set('city', filters.city);
  if (filters.category) params.set('category', filters.category);
  if (filters.employmentType) params.set('employmentType', filters.employmentType);
  if (filters.activity) params.set('activity', filters.activity);
  if (filters.language) params.set('language', filters.language);

  return {
    alternates: {
      canonical: `/jobs?${params.toString()}`,
    },
  };
}
