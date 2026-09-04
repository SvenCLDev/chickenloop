import type { MetadataRoute } from 'next';
import connectDB from '@/lib/db';
import Company from '@/models/Company';
import Job from '@/models/Job';
import { getCompanyUrl } from '@/lib/companySlug';
import { generateJobSlug, generateCountrySlug } from '@/lib/jobSlug';
import { getAllInsightSlugs } from '@/lib/insightsConfig';
import { getPublishedCareerAdviceArticles } from '@/lib/careerAdviceServer';
import { getSiteUrl } from '@/lib/siteUrl';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/jobs`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/companies`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/map`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/career-advice`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/insights`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.85 },
  ];

  const insightUrls: MetadataRoute.Sitemap = getAllInsightSlugs().map((slug) => ({
    url: `${baseUrl}/insights/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'hourly' as const,
    priority: 0.85,
  }));

  try {
    await connectDB();

    const [companies, jobs, careerAdviceArticles] = await Promise.all([
      Company.find({}).select('_id name address updatedAt').lean(),
      Job.find({ published: { $ne: false } }).select('_id title country updatedAt').lean(),
      getPublishedCareerAdviceArticles(),
    ]);

    const companyUrls: MetadataRoute.Sitemap = (companies || []).map((c: { _id: unknown; name?: string; address?: { country?: string }; updatedAt?: Date }) => ({
      url: `${baseUrl}${getCompanyUrl({ name: c.name ?? 'company', address: c.address })}`,
      lastModified: c.updatedAt ? new Date(c.updatedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    const jobUrls: MetadataRoute.Sitemap = (jobs || []).map((j) => {
      const countrySlug = generateCountrySlug(j.country || '');
      const jobSlug = generateJobSlug(j.title || 'job');
      return {
        url: `${baseUrl}/job/${countrySlug}/${jobSlug}`,
        lastModified: j.updatedAt ? new Date(j.updatedAt) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      };
    });

    const careerAdviceUrls: MetadataRoute.Sitemap = careerAdviceArticles.map((article) => ({
      url: `${baseUrl}/career-advice/${article.id}`,
      lastModified: new Date(article.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    }));

    return [...staticPages, ...insightUrls, ...companyUrls, ...jobUrls, ...careerAdviceUrls];
  } catch {
    return [...staticPages, ...insightUrls];
  }
}
