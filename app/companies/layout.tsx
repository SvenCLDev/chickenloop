import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kitesurf Schools Worldwide | Chickenloop',
  description:
    'Discover kitesurf schools and watersport centers worldwide. Explore locations, activities and job openings.',
  alternates: {
    canonical: 'https://chickenloop.com/companies',
  },
};

export default function CompaniesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
