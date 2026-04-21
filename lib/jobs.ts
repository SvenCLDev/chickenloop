import connectDB from '@/lib/db';
import mongoose from 'mongoose';

export interface JobListItem {
  _id: string;
  title: string;
  company?: string;
  city: string;
  country?: string | null;
  pictures?: string[];
  featured?: boolean;
  createdAt?: Date | string;
}

interface GetJobsOptions {
  page: number;
  limit: number;
  featuredOnly?: boolean;
}

export interface PaginatedJobsResult {
  jobs: JobListItem[];
  hasMore: boolean;
}

export async function getJobs({ page, limit, featuredOnly = false }: GetJobsOptions): Promise<PaginatedJobsResult> {
  await connectDB();

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not available');
  }

  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 50) : 20;
  const skip = (safePage - 1) * safeLimit;

  const query: Record<string, unknown> = {
    published: { $ne: false },
  };
  const now = new Date();

  if (featuredOnly) {
    query.featuredUntil = { $gte: now };
  }

  const projection = {
    _id: 1,
    title: 1,
    company: 1,
    city: 1,
    country: 1,
    pictures: 1,
    featuredUntil: 1,
    createdAt: 1,
  };

  if (featuredOnly) {
    const featuredResults = await db
      .collection('jobs')
      .find(query)
      .project(projection)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(safeLimit + 1)
      .toArray();

    const hasMore = featuredResults.length > safeLimit;
    const jobs = featuredResults.slice(0, safeLimit);

    return {
      jobs: jobs.map((job: any) => ({
        _id: job._id.toString(),
        title: job.title,
        company: job.company,
        city: job.city,
        country: job.country ?? null,
        pictures: Array.isArray(job.pictures) ? job.pictures.slice(0, 1) : [],
        featured: true,
        createdAt: job.createdAt,
      })),
      hasMore,
    };
  }

  const featuredResults = await db
    .collection('jobs')
    .find({
      published: { $ne: false },
      featuredUntil: { $gte: now },
    })
    .project(projection)
    .sort({ createdAt: -1, _id: -1 })
    .toArray();

  const standardResults = await db
    .collection('jobs')
    .find({
      published: { $ne: false },
      $or: [
        { featuredUntil: { $exists: false } },
        { featuredUntil: null },
        { featuredUntil: { $lt: now } },
      ],
    })
    .project(projection)
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(safeLimit + 1)
    .toArray();

  const hasMore = standardResults.length > safeLimit;
  const standardPage = standardResults.slice(0, safeLimit);
  const jobs = [...featuredResults, ...standardPage];
  const nowMs = now.getTime();

  return {
    jobs: jobs.map((job: any) => ({
      _id: job._id.toString(),
      title: job.title,
      company: job.company,
      city: job.city,
      country: job.country ?? null,
      pictures: Array.isArray(job.pictures) ? job.pictures.slice(0, 1) : [],
      featured: Boolean(job.featuredUntil && new Date(job.featuredUntil).getTime() >= nowMs),
      createdAt: job.createdAt,
    })),
    hasMore,
  };
}
