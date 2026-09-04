import { getSiteUrl } from '@/lib/siteUrl';
import type { CareerAdviceArticleServer } from '@/lib/careerAdviceServer';
import { stripHtmlToText } from '@/lib/sanitizeText';

export function buildCareerAdviceArticleJsonLd(
  article: CareerAdviceArticleServer,
  pageUrl: string,
) {
  const siteUrl = getSiteUrl();
  const description = stripHtmlToText(article.content).slice(0, 300);

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description,
    datePublished: article.createdAt,
    dateModified: article.updatedAt,
    url: pageUrl,
    image: article.picture ? [article.picture] : undefined,
    author: article.author
      ? {
          '@type': 'Person',
          name: article.author.name,
        }
      : {
          '@type': 'Organization',
          name: 'Chickenloop',
          url: siteUrl,
        },
    publisher: {
      '@type': 'Organization',
      name: 'Chickenloop',
      url: siteUrl,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': pageUrl,
    },
  };
}
