import mongoose from 'mongoose';
import Company from '@/models/Company';
import { getLatestListedJobDocs } from '@/lib/jobs';

/** Minimal job shape for homepage JobCard rendering */
export interface HomepageJobCard {
  _id: string;
  title: string;
  company?: string;
  city: string;
  country?: string | null;
  pictures?: string[];
  featured?: boolean;
  lastRecruiterEditAt?: Date | string;
  createdAt?: Date | string;
}

const HOMEPAGE_JOB_SORT_FIELD = 'lastRecruiterEditAt';

/**
 * Latest published jobs for the homepage (minimal fields, capped limit).
 * Uses the same query, filters, and sort as /jobs — standard (non-featured) jobs only.
 * Used by SSR in app/page.tsx and GET /api/jobs-list?limit=N.
 */
export async function getHomepageLatestJobs(limit = 6): Promise<HomepageJobCard[]> {
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 20);
  const rawJobs = await getLatestListedJobDocs(safeLimit, { excludeFeatured: true });

  if (process.env.NODE_ENV === 'development') {
    console.log('[homepage latest jobs] sort field:', HOMEPAGE_JOB_SORT_FIELD);
    rawJobs.slice(0, 10).forEach((job, index) => {
      console.log(`[homepage latest jobs #${index + 1}]`, {
        title: job.title,
        updatedAt: job.updatedAt,
        createdAt: job.createdAt,
        lastRecruiterEditAt: job.lastRecruiterEditAt,
        sortField: HOMEPAGE_JOB_SORT_FIELD,
      });
    });
  }

  const companyIds = [
    ...new Set(
      rawJobs
        .map((job) => job.companyId)
        .filter(Boolean)
        .map((id) => String(id))
    ),
  ];

  const companyMap = new Map<
    string,
    { name: string; pictures: string[]; logo: string | null }
  >();

  if (companyIds.length > 0) {
    const db = mongoose.connection.db;
    if (db) {
      const companies = await db
        .collection(Company.collection.name)
        .find({
          _id: { $in: companyIds.map((id) => new mongoose.Types.ObjectId(id)) },
        })
        .project({ name: 1, pictures: 1, logo: 1 })
        .maxTimeMS(3000)
        .toArray();

      for (const company of companies) {
        companyMap.set(String(company._id), {
          name: company.name || '',
          pictures: Array.isArray(company.pictures) ? company.pictures : [],
          logo: company.logo || null,
        });
      }
    }
  }

  const nowMs = Date.now();

  return rawJobs.map((job) => {
    const companyId = job.companyId ? String(job.companyId) : null;
    const companyDoc = companyId ? companyMap.get(companyId) : null;

    let pictures: string[] =
      Array.isArray(job.pictures) && job.pictures.length > 0 ? job.pictures : [];

    if (pictures.length === 0 && companyDoc) {
      const fallback =
        (companyDoc.pictures.length > 0 ? companyDoc.pictures[0] : null) || companyDoc.logo;
      if (fallback) {
        pictures = [fallback];
      }
    }

    const featuredUntil = job.featuredUntil ? new Date(job.featuredUntil) : null;
    const isFeatured = !!(
      featuredUntil &&
      !Number.isNaN(featuredUntil.getTime()) &&
      featuredUntil.getTime() >= nowMs
    );

    return {
      _id: String(job._id),
      title: job.title,
      company: job.company || companyDoc?.name || '',
      city: job.city,
      country: job.country ?? null,
      pictures,
      featured: isFeatured,
      lastRecruiterEditAt: job.lastRecruiterEditAt,
      createdAt: job.createdAt,
    };
  });
}
