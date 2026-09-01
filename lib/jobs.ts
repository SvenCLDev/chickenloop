import connectDB from '@/lib/db';
import mongoose from 'mongoose';
import Company from '@/models/Company';
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
  lastRecruiterEditAt?: Date | string;
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

/** Sort order shared by /jobs listing and homepage latest jobs. */
export const JOB_LIST_SORT = {
  lastRecruiterEditAt: -1,
  createdAt: -1,
  _id: -1,
} as const;

export const JOB_LIST_PROJECTION = {
  _id: 1,
  title: 1,
  company: 1,
  companyId: 1,
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
  updatedAt: 1,
} as const;

interface RawJobDoc {
  _id: { toString(): string };
  title: string;
  company?: string;
  companyId?: { toString(): string } | string | null;
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
  updatedAt?: Date | string;
}

function buildFeaturedQuery(
  baseQuery: Record<string, unknown>,
  now: Date
): Record<string, unknown> {
  return {
    ...baseQuery,
    featuredUntil: { $gte: now },
  };
}

function buildStandardQuery(
  baseQuery: Record<string, unknown>,
  now: Date
): Record<string, unknown> {
  return {
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
}

/**
 * Resolve company display names from Company collection when job.company is missing.
 * Same fallback used by homepage Latest Jobs cards.
 */
async function getCompanyNameById(jobs: RawJobDoc[]): Promise<Map<string, string>> {
  const companyIds = [
    ...new Set(
      jobs
        .map((job) => job.companyId)
        .filter(Boolean)
        .map((id) => String(id))
    ),
  ];

  const companyNameById = new Map<string, string>();
  if (companyIds.length === 0) return companyNameById;

  const db = mongoose.connection.db;
  if (!db) return companyNameById;

  const companies = await db
    .collection(Company.collection.name)
    .find({
      _id: { $in: companyIds.map((id) => new mongoose.Types.ObjectId(id)) },
    })
    .project({ name: 1 })
    .maxTimeMS(3000)
    .toArray();

  for (const company of companies) {
    if (company.name) {
      companyNameById.set(String(company._id), String(company.name));
    }
  }

  return companyNameById;
}

function mapRawJobToListItem(
  job: RawJobDoc,
  nowMs: number,
  featuredOverride?: boolean,
  companyNameById?: Map<string, string>
): JobListItem {
  const isFeatured =
    featuredOverride ??
    Boolean(job.featuredUntil && new Date(job.featuredUntil).getTime() >= nowMs);

  const companyId = job.companyId ? String(job.companyId) : null;
  const companyFromDoc = companyId ? companyNameById?.get(companyId) : undefined;

  return {
    _id: job._id.toString(),
    title: job.title,
    company: job.company || companyFromDoc || '',
    city: job.city,
    country: job.country ?? null,
    pictures: Array.isArray(job.pictures) ? job.pictures.slice(0, 1) : [],
    sports: Array.isArray(job.sports) ? job.sports : [],
    languages: Array.isArray(job.languages) ? job.languages : [],
    occupationalAreas: Array.isArray(job.occupationalAreas) ? job.occupationalAreas : [],
    type: job.type,
    featured: isFeatured,
    lastRecruiterEditAt: job.lastRecruiterEditAt,
    createdAt: job.createdAt,
  };
}

/**
 * Fetch the newest jobs using the same query and sort as /jobs.
 * When excludeFeatured is true, returns only non-featured jobs (homepage Latest Jobs).
 */
export async function getLatestListedJobDocs(
  limit: number,
  options?: { excludeFeatured?: boolean; featuredOnly?: boolean; filters?: JobListFilters }
): Promise<RawJobDoc[]> {
  await connectDB();

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not available');
  }

  const jobsCollection = db.collection<RawJobDoc>('jobs');
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 50) : 6;
  const filters = options?.filters;
  const excludeFeatured = options?.excludeFeatured ?? false;
  const featuredOnly = options?.featuredOnly ?? false;
  const baseQuery = buildBaseQuery(filters);
  const now = new Date();
  const featuredQuery = buildFeaturedQuery(baseQuery, now);
  const standardQuery = buildStandardQuery(baseQuery, now);

  if (featuredOnly) {
    return jobsCollection
      .find(featuredQuery)
      .project(JOB_LIST_PROJECTION)
      .sort(JOB_LIST_SORT)
      .limit(safeLimit)
      .maxTimeMS(10000)
      .toArray() as Promise<RawJobDoc[]>;
  }

  if (excludeFeatured) {
    return jobsCollection
      .find(standardQuery)
      .project(JOB_LIST_PROJECTION)
      .sort(JOB_LIST_SORT)
      .limit(safeLimit)
      .maxTimeMS(10000)
      .toArray() as Promise<RawJobDoc[]>;
  }

  const featuredResults = (await jobsCollection
    .find(featuredQuery)
    .project(JOB_LIST_PROJECTION)
    .sort(JOB_LIST_SORT)
    .maxTimeMS(10000)
    .toArray()) as RawJobDoc[];

  const remaining = Math.max(0, safeLimit - featuredResults.length);
  if (remaining === 0) {
    return featuredResults.slice(0, safeLimit);
  }

  const standardResults = (await jobsCollection
    .find(standardQuery)
    .project(JOB_LIST_PROJECTION)
    .sort(JOB_LIST_SORT)
    .limit(remaining)
    .maxTimeMS(10000)
    .toArray()) as RawJobDoc[];

  return [...featuredResults, ...standardResults];
}

export async function getLatestListedJobs(
  limit: number,
  options?: { excludeFeatured?: boolean; filters?: JobListFilters }
): Promise<JobListItem[]> {
  const docs = await getLatestListedJobDocs(limit, options);
  const nowMs = Date.now();
  const companyNameById = await getCompanyNameById(docs);
  return docs.map((job) => mapRawJobToListItem(job, nowMs, undefined, companyNameById));
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
  const jobsCollection = db.collection<RawJobDoc>('jobs');

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

  const featuredQuery = buildFeaturedQuery(baseQuery, now);
  const standardQuery = buildStandardQuery(baseQuery, now);

  if (featuredOnly) {
    const featuredResults = await jobsCollection
      .find(featuredQuery)
      .project(JOB_LIST_PROJECTION)
      .sort(JOB_LIST_SORT)
      .skip(skip)
      .limit(safeLimit + 1)
      .toArray();

    const hasMore = featuredResults.length > safeLimit;
    const jobs = featuredResults.slice(0, safeLimit) as RawJobDoc[];
    const [totalCount, availableCountries, availableCities, availableCategories, availableEmploymentTypes, availableActivities, availableLanguages, companyNameById] = await Promise.all([
      jobsCollection.countDocuments(featuredQuery),
      jobsCollection.distinct('country', countryFacetQuery),
      jobsCollection.distinct('city', cityFacetQuery),
      jobsCollection.distinct('occupationalAreas', categoryFacetQuery),
      jobsCollection.distinct('type', employmentTypeFacetQuery),
      jobsCollection.distinct('sports', activityFacetQuery),
      jobsCollection.distinct('languages', languageFacetQuery),
      getCompanyNameById(jobs),
    ]);

    return {
      jobs: jobs.map((job) => mapRawJobToListItem(job, now.getTime(), true, companyNameById)),
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

  const featuredResults = await jobsCollection
    .find(featuredQuery)
    .project(JOB_LIST_PROJECTION)
    .sort(JOB_LIST_SORT)
    .toArray();

  const standardResults = await jobsCollection
    .find(standardQuery)
    .project(JOB_LIST_PROJECTION)
    .sort(JOB_LIST_SORT)
    .skip(skip)
    .limit(safeLimit + 1)
    .toArray();

  const hasMore = standardResults.length > safeLimit;
  const standardPage = standardResults.slice(0, safeLimit);
  const jobs = [...featuredResults, ...standardPage] as RawJobDoc[];
  const nowMs = now.getTime();
  const [featuredCount, standardCount, availableCountries, availableCities, availableCategories, availableEmploymentTypes, availableActivities, availableLanguages, companyNameById] = await Promise.all([
    jobsCollection.countDocuments(featuredQuery),
    jobsCollection.countDocuments(standardQuery),
    jobsCollection.distinct('country', countryFacetQuery),
    jobsCollection.distinct('city', cityFacetQuery),
    jobsCollection.distinct('occupationalAreas', categoryFacetQuery),
    jobsCollection.distinct('type', employmentTypeFacetQuery),
    jobsCollection.distinct('sports', activityFacetQuery),
    jobsCollection.distinct('languages', languageFacetQuery),
    getCompanyNameById(jobs),
  ]);

  return {
    jobs: jobs.map((job) => mapRawJobToListItem(job, nowMs, undefined, companyNameById)),
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
