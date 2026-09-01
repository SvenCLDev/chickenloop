import type { Metadata } from 'next';
import DeferredHomePageContent from './components/DeferredHomePageContent';
import HomepageHero, { getHomepageHeroLcpPreloadProps } from './components/HomepageHero';
import Navbar from './components/Navbar';
import { getHomepageLatestJobs } from '@/lib/homepageJobs';
import { getDistinctJobCategories } from '@/lib/jobCategoriesQuery';
import { getMarketingSiteUrl } from '@/lib/baseUrlForReferenceEmails';
import { HOMEPAGE_HERO_LCP_IMAGE } from '@/lib/homepageHero';

/** Regenerate homepage job data at most every 60s (ISR). /jobs is dynamic via searchParams. */
export const revalidate = 60;

/** First hero slide — used for social link previews. */
const HOME_OG_IMAGE_PATH = HOMEPAGE_HERO_LCP_IMAGE;
const siteUrl = getMarketingSiteUrl();
const homeOgImageUrl = `${siteUrl}${HOME_OG_IMAGE_PATH}`;

export const metadata: Metadata = {
  title: 'Chickenloop | Watersports Talent Network & Job Board',
  description:
    'The global watersports talent network and free job board for kite, foil, surf, sail, dive and yacht crew. Verified profiles for pros. Trusted hiring for centres.',
  openGraph: {
    title: 'Chickenloop | Watersports Talent Network & Job Board',
    description:
      'The global watersports talent network and free job board for kite, foil, surf, sail, dive and yacht crew. Verified profiles for pros. Trusted hiring for centres.',
    url: siteUrl,
    type: 'website',
    locale: 'en_US',
    siteName: 'Chickenloop',
    images: [
      {
        url: homeOgImageUrl,
        width: 1600,
        height: 1066,
        alt: 'Kitesurfer on the water — Chickenloop watersports talent network',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chickenloop | Watersports Talent Network & Job Board',
    description:
      'The global watersports talent network and free job board for kite, foil, surf, sail, dive and yacht crew. Verified profiles for pros. Trusted hiring for centres.',
    images: [homeOgImageUrl],
  },
};

export default async function HomePage() {
  const [initialLatestJobs, initialCategoryValues] = await Promise.all([
    getHomepageLatestJobs(6),
    getDistinctJobCategories(),
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
          />
        </main>
      </div>
    </>
  );
}
