import { getSiteUrl } from '@/lib/siteUrl';

export function buildInsightsFaqJsonLd(question: string, answer: string, pageUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: answer,
        },
      },
    ],
    url: pageUrl,
  };
}

export function buildInsightsWebPageJsonLd(
  title: string,
  description: string,
  pageUrl: string,
  dateModified: string,
) {
  const siteUrl = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: pageUrl,
    dateModified,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Chickenloop',
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Chickenloop',
      url: siteUrl,
    },
  };
}
