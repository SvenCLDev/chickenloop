import type { MetadataRoute } from 'next';
import connectDB from '@/lib/db';
import Company from '@/models/Company';
import Job from '@/models/Job';
import { generateJobSlug, generateCountrySlug } from '@/lib/jobSlug';

const BASE_URL = 'https://chickenloop.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/jobs`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/companies`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  ];

  try {
    await connectDB();

    const [companies, jobs] = await Promise.all([
      Company.find({}).select('_id updatedAt').lean(),
      Job.find({ published: { $ne: false } }).select('_id title country updatedAt').lean(),
    ]);

    const companyUrls: MetadataRoute.Sitemap = (companies || []).map((c: any) => ({
      url: `${BASE_URL}/companies/${c._id}`,
      lastModified: c.updatedAt ? new Date(c.updatedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    const jobUrls: MetadataRoute.Sitemap = (jobs || []).map((j: any) => {
      const countrySlug = generateCountrySlug(j.country || '');
      const jobSlug = generateJobSlug(j.title || 'job');
      return {
        url: `${BASE_URL}/job/${countrySlug}/${jobSlug}`,
        lastModified: j.updatedAt ? new Date(j.updatedAt) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      };
    });

    return [...staticPages, ...companyUrls, ...jobUrls];
  } catch {
    return staticPages;
  }
}
