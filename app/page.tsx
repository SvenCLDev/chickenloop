import type { Metadata } from 'next';
import HomePageContent from './components/HomePageContent';
import { getHomepageLatestJobs } from '@/lib/homepageJobs';
import { getDistinctJobCategories } from '@/lib/jobCategoriesQuery';

/** Regenerate homepage job data at most every 60s (ISR). /jobs is dynamic via searchParams. */
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Chickenloop | Watersports Talent Network & Job Board',
  description:
    'The global watersports talent network and free job board for kite, foil, surf, sail, dive and yacht crew. Verified profiles for pros. Trusted hiring for centres.',
  openGraph: {
    title: 'Chickenloop | Watersports Talent Network & Job Board',
    description:
      'The global watersports talent network and free job board for kite, foil, surf, sail, dive and yacht crew. Verified profiles for pros. Trusted hiring for centres.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Chickenloop',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chickenloop | Watersports Talent Network & Job Board',
    description:
      'The global watersports talent network and free job board for kite, foil, surf, sail, dive and yacht crew. Verified profiles for pros. Trusted hiring for centres.',
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
