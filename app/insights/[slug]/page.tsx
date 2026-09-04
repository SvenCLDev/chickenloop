import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import InsightPageContent from '@/app/insights/InsightPageContent';
import {
  getAllInsightSlugs,
  getInsightBySlug,
} from '@/lib/insightsConfig';
import { buildInsightAnswer } from '@/lib/insightsContent';
import { getJobMarketStats } from '@/lib/jobMarketStats';
import {
  buildInsightsFaqJsonLd,
  buildInsightsWebPageJsonLd,
} from '@/lib/seo/insightsJsonLd';
import { getSiteUrl } from '@/lib/siteUrl';

export const revalidate = 3600;

export function generateStaticParams() {
  return getAllInsightSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const config = getInsightBySlug(slug);
  if (!config) {
    return { title: 'Insight not found' };
  }

  return {
    title: `${config.title} | Chickenloop`,
    description: config.description,
    alternates: {
      canonical: `/insights/${config.slug}`,
    },
    openGraph: {
      title: config.question,
      description: config.description,
      type: 'article',
    },
  };
}

export default async function InsightSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = getInsightBySlug(slug);
  if (!config) {
    notFound();
  }

  const stats = await getJobMarketStats(config.filter);
  const answer = buildInsightAnswer(config, stats);
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/insights/${config.slug}`;

  const faqJsonLd = buildInsightsFaqJsonLd(config.question, answer, pageUrl);
  const webPageJsonLd = buildInsightsWebPageJsonLd(
    config.title,
    config.description,
    pageUrl,
    stats.generatedAt,
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <Navbar />
      <InsightPageContent config={config} stats={stats} answer={answer} />
    </>
  );
}
