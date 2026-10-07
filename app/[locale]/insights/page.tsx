import Link from 'next/link';
import type { Metadata } from 'next';
import Navbar from '@/app/components/Navbar';
import { INSIGHT_PAGES } from '@/lib/insightsConfig';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Watersports Job Market Insights | Chickenloop',
  description:
    'Live watersports job market statistics — jobs by country, kitesurfing instructor openings, employment types, and more from Chickenloop.',
  alternates: {
    canonical: '/insights',
  },
};

export default function InsightsIndexPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          Watersports Job Market Insights
        </h1>
        <p className="text-lg text-gray-700 mb-8">
          Live statistics from the Chickenloop job board — updated hourly. Each page answers a
          specific question with current job counts by country, sport, and role.
        </p>

        <ul className="space-y-4">
          {INSIGHT_PAGES.map((page) => (
            <li key={page.slug}>
              <Link
                href={`/insights/${page.slug}`}
                className="block bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-1">{page.question}</h2>
                <p className="text-gray-600 text-sm">{page.description}</p>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-sm text-gray-600">
          Looking for work?{' '}
          <Link href="/jobs" className="text-blue-600 hover:underline">
            Browse all jobs
          </Link>
          {' · '}
          <Link href="/map" className="text-blue-600 hover:underline">
            View jobs on the map
          </Link>
        </p>
      </main>
    </div>
  );
}
