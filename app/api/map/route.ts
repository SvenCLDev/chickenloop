import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import Company from '@/models/Company';
import { getCountryCentroid } from '@/lib/countryCentroids';
import { getJobUrl } from '@/lib/jobSlug';
import { getCompanyUrl } from '@/lib/companySlug';
import { CachePresets } from '@/lib/cache';

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  href: string;
  title: string;
  subtitle?: string;
}

/**
 * GET /api/map
 * Returns jobs and companies with lat/lng for world map display.
 * Jobs use country centroid (job.country); companies use coordinates when available, else country centroid.
 */
export async function GET() {
  try {
    await connectDB();

    const [jobs, companies] = await Promise.all([
      Job.find({ published: { $ne: false } })
        .select('_id title city country')
        .lean(),
      Company.find({})
        .select('_id name address coordinates')
        .lean(),
    ]);

    const jobPoints: MapPoint[] = [];
    for (const job of jobs) {
      const countryCode = job.country?.trim();
      const centroid = getCountryCentroid(countryCode);
      if (!centroid) continue;
      const [lat, lng] = centroid;
      const href = getJobUrl({ title: job.title, country: job.country });
      const subtitle = [job.city, job.country].filter(Boolean).join(', ') || undefined;
      jobPoints.push({
        id: String(job._id),
        lat,
        lng,
        href,
        title: job.title,
        subtitle,
      });
    }

    const companyPoints: MapPoint[] = [];
    for (const company of companies) {
      let lat: number;
      let lng: number;
      if (
        company.coordinates &&
        typeof company.coordinates.latitude === 'number' &&
        typeof company.coordinates.longitude === 'number' &&
        Number.isFinite(company.coordinates.latitude) &&
        Number.isFinite(company.coordinates.longitude)
      ) {
        lat = company.coordinates.latitude;
        lng = company.coordinates.longitude;
      } else {
        const countryCode = company.address?.country?.trim();
        const centroid = getCountryCentroid(countryCode);
        if (!centroid) continue;
        [lat, lng] = centroid;
      }
      const href = getCompanyUrl({
        id: String(company._id),
        name: company.name,
        address: company.address,
      });
      const city = company.address?.city?.trim();
      const country = company.address?.country?.trim();
      const subtitle = [city, country].filter(Boolean).join(', ') || undefined;
      companyPoints.push({
        id: String(company._id),
        lat,
        lng,
        href,
        title: company.name,
        subtitle,
      });
    }

    const cacheHeaders = CachePresets.short();
    return NextResponse.json(
      { jobs: jobPoints, companies: companyPoints },
      { status: 200, headers: cacheHeaders }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[API /map]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
