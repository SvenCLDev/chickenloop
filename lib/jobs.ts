import connectDB from '@/lib/db';
import mongoose from 'mongoose';
import { getCountryCodeFromName } from '@/lib/countryUtils';

export interface JobListItem {
  _id: string;
  title: string;
  company?: string;
  city: string;
  country?: string | null;
  pictures?: string[];
  featured?: boolean;
  sports?: string[];
  languages?: string[];
  occupationalAreas?: string[];
  type?: string;
  createdAt?: Date | string;
}

interface GetJobsOptions {
  page: number;
  limit: number;
  featuredOnly?: boolean;
  filters?: JobListFilters;
}

export interface JobListFilters {
  keyword?: string;
  location?: string;
  country?: string;
  city?: string;
  category?: string;
  employmentType?: string;
  activity?: string;
  language?: string;
}

export interface PaginatedJobsResult {
  jobs: JobListItem[];
  hasMore: boolean;
  totalCount: number;
  availableCountries: string[];
  availableCities: string[];
  availableCategories: string[];
  availableEmploymentTypes: string[];
  availableActivities: string[];
  availableLanguages: string[];
}

interface RawJobDoc {
  _id: { toString(): string };
  title: string;
  company?: string;
  city: string;
  country?: string | null;
  pictures?: string[];
  sports?: string[];
  languages?: string[];
  occupationalAreas?: string[];
  type?: string;
  featuredUntil?: Date | string | null;
  lastRecruiterEditAt?: Date | string;
  createdAt?: Date | string;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildBaseQuery(filters?: JobListFilters): Record<string, unknown> {
  const andConditions: Record<string, unknown>[] = [{ published: { $ne: false } }];
  const keyword = filters?.keyword?.trim();
  if (keyword) {
    const keywordRegex = new RegExp(escapeRegex(keyword), 'i');
    andConditions.push({
      $or: [{ title: keywordRegex }, { description: keywordRegex }, { company: keywordRegex }],
    });
  }

  const location = filters?.location?.trim();
  if (location && location.length >= 2) {
    const locationRegex = new RegExp(escapeRegex(location), 'i');
    const locationOr: Record<string, unknown>[] = [
      { city: locationRegex },
      { country: locationRegex },
    ];
    const locationCountryCode = getCountryCodeFromName(location);
    if (locationCountryCode) {
      locationOr.push({ country: locationCountryCode });
    }
    andConditions.push({ $or: locationOr });
  }

  const country = filters?.country?.trim();
  if (country) {
    const countryCode = getCountryCodeFromName(country);
    if (countryCode) {
      andConditions.push({ country: countryCode });
    } else {
      andConditions.push({ country: new RegExp(`^${escapeRegex(country)}$`, 'i') });
    }
  }

  const city = filters?.city?.trim();
  if (city) {
    andConditions.push({ city: new RegExp(`^${escapeRegex(city)}$`, 'i') });
  }

  const category = filters?.category?.trim();
  if (category) {
    andConditions.push({ occupationalAreas: category });
  }

  const employmentType = filters?.employmentType?.trim();
  if (employmentType) {
    andConditions.push({ type: employmentType });
  }

  const activity = filters?.activity?.trim();
  if (activity) {
    andConditions.push({ sports: activity });
  }

  const language = filters?.language?.trim();
  if (language) {
    andConditions.push({ languages: language });
  }

  if (andConditions.length === 1) {
    return andConditions[0];
  }
  return { $and: andConditions };
}

function buildFacetQuery(
  filters: JobListFilters | undefined,
  excludeKey: keyof JobListFilters
): Record<string, unknown> {
  if (!filters) {
    return buildBaseQuery();
  }

  const facetFilters: JobListFilters = { ...filters, [excludeKey]: undefined };
  return buildBaseQuery(facetFilters);
}

function normalizeCountryCodes(values: unknown[]): string[] {
  return Array.from(
    new Set(
      values
        .map((country) => String(country || '').trim().toUpperCase())
        .filter(Boolean)
    )
  );
}

function normalizeStringValues(values: unknown[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    )
  );
}

export async function getJobs({
  page,
  limit,
  featuredOnly = false,
  filters,
}: GetJobsOptions): Promise<PaginatedJobsResult> {
  await connectDB();

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not available');
  }

  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 50) : 20;
  const skip = (safePage - 1) * safeLimit;

  const baseQuery = buildBaseQuery(filters);
  const countryFacetQuery = buildFacetQuery(filters, 'country');
  const cityFacetQuery = buildFacetQuery(filters, 'city');
  const categoryFacetQuery = buildFacetQuery(filters, 'category');
  const employmentTypeFacetQuery = buildFacetQuery(filters, 'employmentType');
  const activityFacetQuery = buildFacetQuery(filters, 'activity');
  const languageFacetQuery = buildFacetQuery(filters, 'language');
  const now = new Date();

  const featuredQuery: Record<string, unknown> = {
    ...baseQuery,
    featuredUntil: { $gte: now },
  };
  const standardQuery: Record<string, unknown> = {
    ...baseQuery,
    $and: [
      ...(Array.isArray(baseQuery.$and) ? (baseQuery.$and as Record<string, unknown>[]) : []),
      {
        $or: [
          { featuredUntil: { $exists: false } },
          { featuredUntil: null },
          { featuredUntil: { $lt: now } },
        ],
      },
    ],
  };

  const projection = {
    _id: 1,
    title: 1,
    company: 1,
    city: 1,
    country: 1,
    pictures: 1,
    sports: 1,
    languages: 1,
    occupationalAreas: 1,
    type: 1,
    featuredUntil: 1,
    lastRecruiterEditAt: 1,
    createdAt: 1,
  };

  if (featuredOnly) {
    const featuredResults = await db
      .collection('jobs')
      .find(featuredQuery)
      .project(projection)
      .sort({ lastRecruiterEditAt: -1, createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(safeLimit + 1)
      .toArray();

    const hasMore = featuredResults.length > safeLimit;
    const jobs = featuredResults.slice(0, safeLimit);
    const [totalCount, availableCountries, availableCities, availableCategories, availableEmploymentTypes, availableActivities, availableLanguages] = await Promise.all([
      db.collection('jobs').countDocuments(featuredQuery),
      db.collection('jobs').distinct('country', countryFacetQuery),
      db.collection('jobs').distinct('city', cityFacetQuery),
      db.collection('jobs').distinct('occupationalAreas', categoryFacetQuery),
      db.collection('jobs').distinct('type', employmentTypeFacetQuery),
      db.collection('jobs').distinct('sports', activityFacetQuery),
      db.collection('jobs').distinct('languages', languageFacetQuery),
    ]);

    return {
      jobs: jobs.map((job: RawJobDoc) => ({
        _id: job._id.toString(),
        title: job.title,
        company: job.company,
        city: job.city,
        country: job.country ?? null,
        pictures: Array.isArray(job.pictures) ? job.pictures.slice(0, 1) : [],
        sports: Array.isArray(job.sports) ? job.sports : [],
        languages: Array.isArray(job.languages) ? job.languages : [],
        occupationalAreas: Array.isArray(job.occupationalAreas) ? job.occupationalAreas : [],
        type: job.type,
        featured: true,
        createdAt: job.createdAt,
      })),
      hasMore,
      totalCount,
      availableCountries: normalizeCountryCodes(availableCountries),
      availableCities: normalizeStringValues(availableCities),
      availableCategories: normalizeStringValues(availableCategories),
      availableEmploymentTypes: normalizeStringValues(availableEmploymentTypes),
      availableActivities: normalizeStringValues(availableActivities),
      availableLanguages: normalizeStringValues(availableLanguages),
    };
  }

  const featuredResults = await db
    .collection('jobs')
    .find(featuredQuery)
    .project(projection)
    .sort({ lastRecruiterEditAt: -1, createdAt: -1, _id: -1 })
    .toArray();

  const standardResults = await db
    .collection('jobs')
    .find(standardQuery)
    .project(projection)
    .sort({ lastRecruiterEditAt: -1, createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(safeLimit + 1)
    .toArray();

  const hasMore = standardResults.length > safeLimit;
  const standardPage = standardResults.slice(0, safeLimit);
  const jobs = [...featuredResults, ...standardPage];
  const nowMs = now.getTime();
  const [featuredCount, standardCount, availableCountries, availableCities, availableCategories, availableEmploymentTypes, availableActivities, availableLanguages] = await Promise.all([
    db.collection('jobs').countDocuments(featuredQuery),
    db.collection('jobs').countDocuments(standardQuery),
    db.collection('jobs').distinct('country', countryFacetQuery),
    db.collection('jobs').distinct('city', cityFacetQuery),
    db.collection('jobs').distinct('occupationalAreas', categoryFacetQuery),
    db.collection('jobs').distinct('type', employmentTypeFacetQuery),
    db.collection('jobs').distinct('sports', activityFacetQuery),
    db.collection('jobs').distinct('languages', languageFacetQuery),
  ]);

  return {
    jobs: jobs.map((job: RawJobDoc) => ({
      _id: job._id.toString(),
      title: job.title,
      company: job.company,
      city: job.city,
      country: job.country ?? null,
      pictures: Array.isArray(job.pictures) ? job.pictures.slice(0, 1) : [],
      sports: Array.isArray(job.sports) ? job.sports : [],
      languages: Array.isArray(job.languages) ? job.languages : [],
      occupationalAreas: Array.isArray(job.occupationalAreas) ? job.occupationalAreas : [],
      type: job.type,
      featured: Boolean(job.featuredUntil && new Date(job.featuredUntil).getTime() >= nowMs),
      createdAt: job.createdAt,
    })),
    hasMore,
    totalCount: featuredCount + standardCount,
    availableCountries: normalizeCountryCodes(availableCountries),
    availableCities: normalizeStringValues(availableCities),
    availableCategories: normalizeStringValues(availableCategories),
    availableEmploymentTypes: normalizeStringValues(availableEmploymentTypes),
    availableActivities: normalizeStringValues(availableActivities),
    availableLanguages: normalizeStringValues(availableLanguages),
  };
}
