'use client';

import dynamic from 'next/dynamic';
import HomePageBelowFoldPlaceholder from './HomePageBelowFoldPlaceholder';

const HomePageContent = dynamic(() => import('./HomePageContent'), {
  ssr: false,
  loading: () => <HomePageBelowFoldPlaceholder />,
});

type HomePageContentProps = {
  initialLatestJobs: Awaited<
    ReturnType<typeof import('@/lib/homepageJobs').getHomepageLatestJobs>
  >;
  initialCategoryValues: string[];
};

export default function DeferredHomePageContent(props: HomePageContentProps) {
  return <HomePageContent {...props} />;
}
