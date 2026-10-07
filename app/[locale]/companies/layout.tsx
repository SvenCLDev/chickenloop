import { Metadata } from 'next';

const BASE_URL = 'https://chickenloop.com';
const OG_IMAGE_URL = `${BASE_URL}/company-listing.jpg`;

export const metadata: Metadata = {
  title: 'Kitesurf Schools Worldwide | Chickenloop',
  description:
    'Discover kitesurf schools and watersport centers worldwide. Explore locations, activities and job openings.',
  alternates: {
    canonical: `${BASE_URL}/companies`,
  },
  openGraph: {
    title: 'Kitesurf Schools Worldwide | Chickenloop',
    description:
      'Discover kitesurf schools and watersport centers worldwide. Explore locations, activities and job openings.',
    url: `${BASE_URL}/companies`,
    type: 'website',
    siteName: 'Chickenloop',
    images: [
      {
        url: OG_IMAGE_URL,
        alt: 'Kitesurf schools and watersport centers on Chickenloop',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kitesurf Schools Worldwide | Chickenloop',
    description:
      'Discover kitesurf schools and watersport centers worldwide. Explore locations, activities and job openings.',
    images: [OG_IMAGE_URL],
  },
};

export default function CompaniesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
