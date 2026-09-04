import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CareerAdviceArticleClient from './CareerAdviceArticleClient';
import { getCareerAdviceArticleById } from '@/lib/careerAdviceServer';
import { buildCareerAdviceArticleJsonLd } from '@/lib/seo/careerAdviceJsonLd';
import { getSiteUrl } from '@/lib/siteUrl';

export default async function CareerAdviceArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getCareerAdviceArticleById(id);

  if (!article) {
    notFound();
  }

  const pageUrl = `${getSiteUrl()}/career-advice/${id}`;
  const articleJsonLd = buildCareerAdviceArticleJsonLd(article, pageUrl);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <CareerAdviceArticleClient articleId={id} initialArticle={article} />
    </>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const article = await getCareerAdviceArticleById(id);

  if (!article) {
    return { title: 'Article not found' };
  }

  return {
    title: `${article.title} | Career Advice | Chickenloop`,
    description: article.title,
    alternates: {
      canonical: `/career-advice/${id}`,
    },
    openGraph: {
      title: article.title,
      type: 'article',
      publishedTime: article.createdAt,
      modifiedTime: article.updatedAt,
      images: article.picture ? [{ url: article.picture }] : undefined,
    },
  };
}
