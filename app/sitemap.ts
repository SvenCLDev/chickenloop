import type { MetadataRoute } from 'next';
import connectDB from '@/lib/db';
import Company from '@/models/Company';
import Job from '@/models/Job';
import { getCompanyUrl } from '@/lib/companySlug';
import { buildJobPathSlug, generateCountrySlug } from '@/lib/jobSlug';
import { getAllInsightSlugs } from '@/lib/insightsConfig';
import { getPublishedCareerAdviceArticles } from '@/lib/careerAdviceServer';
import { getSiteUrl } from '@/lib/siteUrl';
import { locales } from '@/i18n/routing';

function withLocales(path: string): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return locales.map((locale) => ({
    url: `${baseUrl}/${locale}${normalized === '/' ? '' : normalized}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: normalized === '/' ? 1 : 0.9,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();

  const staticPages: MetadataRoute.Sitemap = [
    ...withLocales('/'),
    ...withLocales('/jobs'),
    ...withLocales('/companies'),
    ...withLocales('/map'),
    ...withLocales('/career-advice'),
    ...withLocales('/insights'),
    ...withLocales('/login'),
    ...withLocales('/register'),
  ].map((entry) => {
    // Preserve intended priorities for primary pages
    const path = entry.url.replace(baseUrl, '');
    let priority = 0.8;
    let changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] = 'weekly';
    if (path.endsWith('/en') || path.match(/\/(en|de|es)$/)) {
      priority = 1;
      changeFrequency = 'daily';
    } else if (path.includes('/jobs') || path.includes('/companies')) {
      priority = 0.9;
      changeFrequency = 'daily';
    } else if (path.includes('/insights')) {
      priority = 0.85;
      changeFrequency = 'hourly';
    } else if (path.includes('/map') || path.includes('/career-advice')) {
      priority = 0.8;
      changeFrequency = path.includes('/map') ? 'daily' : 'weekly';
    } else if (path.includes('/login') || path.includes('/register')) {
      priority = 0.5;
      changeFrequency = 'monthly';
    }
    return { ...entry, priority, changeFrequency, lastModified: new Date() };
  });

  const insightUrls: MetadataRoute.Sitemap = getAllInsightSlugs().flatMap((slug) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}/insights/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 0.85,
    }))
  );

  try {
    await connectDB();

    const [companies, jobs, careerAdviceArticles] = await Promise.all([
      Company.find({}).select('_id name address updatedAt').lean(),
      Job.find({ published: { $ne: false } }).select('_id title country updatedAt').lean(),
      getPublishedCareerAdviceArticles(),
    ]);

    const companyUrls: MetadataRoute.Sitemap = (companies || []).flatMap(
      (c: { _id: unknown; name?: string; address?: { country?: string }; updatedAt?: Date }) => {
        const path = getCompanyUrl({ name: c.name ?? 'company', address: c.address });
        return locales.map((locale) => ({
          url: `${baseUrl}/${locale}${path}`,
          lastModified: c.updatedAt ? new Date(c.updatedAt) : new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }));
      }
    );

    const jobUrls: MetadataRoute.Sitemap = (jobs || []).flatMap((j) => {
      const countrySlug = generateCountrySlug(j.country || '');
      const jobSlug = buildJobPathSlug(j.title || 'job', j._id);
      return locales.map((locale) => ({
        url: `${baseUrl}/${locale}/job/${countrySlug}/${jobSlug}`,
        lastModified: j.updatedAt ? new Date(j.updatedAt) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
    });

    const careerAdviceUrls: MetadataRoute.Sitemap = careerAdviceArticles.flatMap((article) =>
      locales.map((locale) => ({
        url: `${baseUrl}/${locale}/career-advice/${article.id}`,
        lastModified: new Date(article.updatedAt),
        changeFrequency: 'monthly' as const,
        priority: 0.75,
      }))
    );

    return [...staticPages, ...insightUrls, ...companyUrls, ...jobUrls, ...careerAdviceUrls];
  } catch {
    return [...staticPages, ...insightUrls];
  }
}
