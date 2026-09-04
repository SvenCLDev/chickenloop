import 'server-only';

import connectDB from '@/lib/db';
import Job from '@/models/Job';
import { getCountryNameFromCode } from '@/lib/countryUtils';
import { JOB_CATEGORIES } from '@/lib/jobCategories';

const PUBLISHED_FILTER = { published: { $ne: false } };

export interface CountRow {
  value: string;
  label: string;
  count: number;
}

export interface CountryCountRow {
  code: string;
  label: string;
  count: number;
}

export interface CityCountRow {
  city: string;
  country: string;
  countryLabel: string;
  count: number;
}

export interface JobMarketStats {
  generatedAt: string;
  totalPublishedJobs: number;
  featuredJobs: number;
  newJobsLast7Days: number;
  newJobsLast30Days: number;
  byCountry: CountryCountRow[];
  bySport: CountRow[];
  byCategory: CountRow[];
  byEmploymentType: CountRow[];
  topCities: CityCountRow[];
  companiesHiringByCountry: CountryCountRow[];
}

export interface JobMarketFilter {
  country?: string;
  sport?: string;
  category?: string;
}

const CATEGORY_LABELS = Object.fromEntries(
  JOB_CATEGORIES.map((c) => [c.value, c.label]),
) as Record<string, string>;

function formatSportLabel(sport: string): string {
  return sport
    .split(/[\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatEmploymentType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function buildMatchFilter(filter?: JobMarketFilter): Record<string, unknown> {
  const match: Record<string, unknown> = { ...PUBLISHED_FILTER };
  if (filter?.country) {
    match.country = filter.country.trim().toUpperCase();
  }
  if (filter?.sport) {
    match.sports = filter.sport;
  }
  if (filter?.category) {
    match.occupationalAreas = filter.category;
  }
  return match;
}

async function countNewJobs(since: Date, filter?: JobMarketFilter): Promise<number> {
  await connectDB();
  const match = {
    ...buildMatchFilter(filter),
    $or: [
      { createdAt: { $gte: since } },
      { datePosted: { $gte: since } },
      { lastRecruiterEditAt: { $gte: since } },
    ],
  };
  return Job.countDocuments(match);
}

async function groupByCountry(filter?: JobMarketFilter): Promise<CountryCountRow[]> {
  await connectDB();
  const rows = await Job.aggregate([
    { $match: { ...buildMatchFilter(filter), country: { $exists: true, $nin: [null, ''] } } },
    { $group: { _id: '$country', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return rows.map((row: { _id: string; count: number }) => ({
    code: row._id,
    label: getCountryNameFromCode(row._id) || row._id,
    count: row.count,
  }));
}

async function groupByField(
  field: 'sports' | 'occupationalAreas',
  filter?: JobMarketFilter,
  labelMap?: Record<string, string>,
): Promise<CountRow[]> {
  await connectDB();
  const rows = await Job.aggregate([
    { $match: buildMatchFilter(filter) },
    { $unwind: `$${field}` },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return rows.map((row: { _id: string; count: number }) => ({
    value: row._id,
    label: labelMap?.[row._id] ?? (field === 'sports' ? formatSportLabel(row._id) : row._id),
    count: row.count,
  }));
}

async function groupByEmploymentType(filter?: JobMarketFilter): Promise<CountRow[]> {
  await connectDB();
  const rows = await Job.aggregate([
    { $match: { ...buildMatchFilter(filter), type: { $exists: true, $nin: [null, ''] } } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return rows.map((row: { _id: string; count: number }) => ({
    value: row._id,
    label: formatEmploymentType(row._id),
    count: row.count,
  }));
}

async function groupTopCities(filter?: JobMarketFilter, limit = 20): Promise<CityCountRow[]> {
  await connectDB();
  const rows = await Job.aggregate([
    {
      $match: {
        ...buildMatchFilter(filter),
        city: { $exists: true, $nin: [null, ''] },
        country: { $exists: true, $nin: [null, ''] },
      },
    },
    { $group: { _id: { city: '$city', country: '$country' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
  return rows.map((row: { _id: { city: string; country: string }; count: number }) => ({
    city: row._id.city,
    country: row._id.country,
    countryLabel: getCountryNameFromCode(row._id.country) || row._id.country,
    count: row.count,
  }));
}

async function groupCompaniesByCountry(filter?: JobMarketFilter): Promise<CountryCountRow[]> {
  await connectDB();
  const rows = await Job.aggregate([
    {
      $match: {
        ...buildMatchFilter(filter),
        country: { $exists: true, $nin: [null, ''] },
        companyId: { $exists: true, $ne: null },
      },
    },
    { $group: { _id: { country: '$country', companyId: '$companyId' } } },
    { $group: { _id: '$_id.country', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return rows.map((row: { _id: string; count: number }) => ({
    code: row._id,
    label: getCountryNameFromCode(row._id) || row._id,
    count: row.count,
  }));
}

export async function getJobMarketStats(filter?: JobMarketFilter): Promise<JobMarketStats> {
  await connectDB();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const match = buildMatchFilter(filter);

  const [
    totalPublishedJobs,
    featuredJobs,
    newJobsLast7Days,
    newJobsLast30Days,
    byCountry,
    bySport,
    byCategory,
    byEmploymentType,
    topCities,
    companiesHiringByCountry,
  ] = await Promise.all([
    Job.countDocuments(match),
    Job.countDocuments({
      ...match,
      featuredUntil: { $gte: now },
    }),
    countNewJobs(sevenDaysAgo, filter),
    countNewJobs(thirtyDaysAgo, filter),
    groupByCountry(filter),
    groupByField('sports', filter, undefined),
    groupByField('occupationalAreas', filter, CATEGORY_LABELS),
    groupByEmploymentType(filter),
    groupTopCities(filter),
    groupCompaniesByCountry(filter),
  ]);

  return {
    generatedAt: now.toISOString(),
    totalPublishedJobs,
    featuredJobs,
    newJobsLast7Days,
    newJobsLast30Days,
    byCountry,
    bySport,
    byCategory,
    byEmploymentType,
    topCities,
    companiesHiringByCountry,
  };
}

export async function getFilteredJobCount(filter: JobMarketFilter): Promise<number> {
  await connectDB();
  return Job.countDocuments(buildMatchFilter(filter));
}

export async function getCountryJobStats(countryCode: string): Promise<JobMarketStats> {
  return getJobMarketStats({ country: countryCode });
}

export async function getKitesurfingInstructorStats(): Promise<JobMarketStats> {
  return getJobMarketStats({ sport: 'kitesurfing', category: 'instructor' });
}
