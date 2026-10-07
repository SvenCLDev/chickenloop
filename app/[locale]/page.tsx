import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import DeferredHomePageContent from '@/app/components/DeferredHomePageContent';
import HomepageHero, { getHomepageHeroLcpPreloadProps } from '@/app/components/HomepageHero';
import Navbar from '@/app/components/Navbar';
import { getHomepageFeaturedJobs, getHomepageLatestJobs } from '@/lib/homepageJobs';
import { getDistinctJobCategories } from '@/lib/jobCategoriesQuery';
import { getSiteUrl } from '@/lib/siteUrl';
import { HOMEPAGE_HERO_LCP_IMAGE } from '@/lib/homepageHero';
import {
  localeAlternates,
  localizedAbsoluteUrl,
  ogLocaleByAppLocale,
  type AppLocale,
} from '@/i18n/seo';
import { routing } from '@/i18n/routing';

/** Regenerate homepage job data at most every 60s (ISR). */
export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: localeParam } = await params;
  if (!hasLocale(routing.locales, localeParam)) {
    return {};
  }
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  const homeUrl = localizedAbsoluteUrl(locale, '/');
  const ogImageUrl = `${getSiteUrl()}${HOMEPAGE_HERO_LCP_IMAGE}`;

  return {
    title: t('homeTitle'),
    description: t('homeDescription'),
    alternates: localeAlternates(locale, '/'),
    openGraph: {
      title: t('homeTitle'),
      description: t('homeDescription'),
      url: homeUrl,
      type: 'website',
      locale: ogLocaleByAppLocale[locale],
      siteName: 'Chickenloop',
      images: [
        {
          url: ogImageUrl,
          width: 1600,
          height: 1066,
          alt: t('homeOgImageAlt'),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('homeTitle'),
      description: t('homeDescription'),
      images: [ogImageUrl],
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const [initialLatestJobs, initialCategoryValues, initialFeaturedJobs] = await Promise.all([
    getHomepageLatestJobs(6),
    getDistinctJobCategories(),
    getHomepageFeaturedJobs(6),
  ]);

  const heroLcpPreload = getHomepageHeroLcpPreloadProps();

  return (
    <>
      <link
        rel="preload"
        as="image"
        href={heroLcpPreload.src}
        imageSrcSet={heroLcpPreload.srcSet}
        imageSizes={heroLcpPreload.sizes}
        fetchPriority="high"
        media="(max-width: 768px)"
      />
      <link
        rel="preload"
        as="image"
        href={heroLcpPreload.src}
        imageSrcSet={heroLcpPreload.srcSet}
        imageSizes={heroLcpPreload.sizes}
        fetchPriority="high"
        media="(min-width: 769px)"
      />
      <div className="min-h-screen flex flex-col">
        <Navbar logoPriority={false} />
        <main className="flex-grow">
          <HomepageHero />
          <DeferredHomePageContent
            initialLatestJobs={initialLatestJobs}
            initialCategoryValues={initialCategoryValues}
            initialFeaturedJobs={initialFeaturedJobs}
          />
        </main>
      </div>
    </>
  );
}
