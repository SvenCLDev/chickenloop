import type { Metadata } from 'next';
import HomePageContent from './components/HomePageContent';
import { getHomepageLatestJobs } from '@/lib/homepageJobs';
import { getDistinctJobCategories } from '@/lib/jobCategoriesQuery';
import { getMarketingSiteUrl } from '@/lib/baseUrlForReferenceEmails';

/** Regenerate homepage job data at most every 60s (ISR). /jobs is dynamic via searchParams. */
export const revalidate = 60;

/** First hero slide in HomePageContent HERO_IMAGES — used for social link previews. */
const HOME_OG_IMAGE_PATH = '/Kitesurfer.jpg';
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
        width: 2000,
        height: 1333,
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

  return (
    <HomePageContent
      initialLatestJobs={initialLatestJobs}
      initialCategoryValues={initialCategoryValues}
    />
  );
}
