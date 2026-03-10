import type { Metadata } from 'next';
import HomePageContent from './components/HomePageContent';

export const metadata: Metadata = {
  title: 'Chickenloop | Free Watersports Job Board',
  description: 'Find your next watersports job for free on Chickenloop. The leading global job board for kiteboarding, surf, windsurf, sailing and dive professionals. No fees, just jobs.',
  openGraph: {
    title: 'Chickenloop | Free Watersports Job Board',
    description: 'Find your next watersports job for free on Chickenloop. The leading global job board for kiteboarding, surf, windsurf, sailing and dive professionals. No fees, just jobs.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Chickenloop',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chickenloop | Free Watersports Job Board',
    description: 'Find your next watersports job for free on Chickenloop. The leading global job board for kiteboarding, surf, windsurf, sailing and dive professionals. No fees, just jobs.',
  },
};

export default function HomePage() {
  return <HomePageContent />;
}
