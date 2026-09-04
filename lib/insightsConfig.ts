import type { JobMarketFilter } from '@/lib/jobMarketStats';

export type InsightSlug =
  | 'watersports-jobs-by-country'
  | 'kitesurfing-jobs-by-country'
  | 'jobs-by-category-and-sport'
  | 'employment-types'
  | 'watersports-jobs-in-spain'
  | 'watersports-jobs-in-greece'
  | 'watersports-jobs-in-italy';

export interface InsightPageConfig {
  slug: InsightSlug;
  title: string;
  question: string;
  description: string;
  filter?: JobMarketFilter;
  countryCode?: string;
  tableType: 'country' | 'sport' | 'category' | 'employmentType' | 'city' | 'categorySport';
}

export const INSIGHT_PAGES: InsightPageConfig[] = [
  {
    slug: 'watersports-jobs-by-country',
    title: 'Watersports Jobs by Country',
    question: 'Where are the most watersports centre jobs worldwide?',
    description:
      'Live count of open watersports jobs on Chickenloop, ranked by country. Updated from our job board database.',
    tableType: 'country',
  },
  {
    slug: 'kitesurfing-jobs-by-country',
    title: 'Kitesurfing Instructor Jobs by Country',
    question: 'Which countries have the most kitesurfing instructor jobs?',
    description:
      'Live count of open kitesurfing instructor roles on Chickenloop, ranked by country.',
    filter: { sport: 'kitesurfing', category: 'instructor' },
    tableType: 'country',
  },
  {
    slug: 'jobs-by-category-and-sport',
    title: 'Watersports Jobs by Category and Sport',
    question: 'What types of watersports jobs are hiring right now?',
    description:
      'Breakdown of open watersports jobs by role category and sport activity on Chickenloop.',
    tableType: 'categorySport',
  },
  {
    slug: 'employment-types',
    title: 'Watersports Jobs by Employment Type',
    question: 'How many seasonal vs full-time watersports jobs are available?',
    description:
      'Breakdown of open watersports jobs by employment type (full-time, seasonal, contract, etc.).',
    tableType: 'employmentType',
  },
  {
    slug: 'watersports-jobs-in-spain',
    title: 'Watersports Jobs in Spain',
    question: 'How many watersports jobs are in Spain?',
    description: 'Live count of open watersports jobs in Spain on Chickenloop.',
    countryCode: 'ES',
    filter: { country: 'ES' },
    tableType: 'city',
  },
  {
    slug: 'watersports-jobs-in-greece',
    title: 'Watersports Jobs in Greece',
    question: 'How many watersports jobs are in Greece?',
    description: 'Live count of open watersports jobs in Greece on Chickenloop.',
    countryCode: 'GR',
    filter: { country: 'GR' },
    tableType: 'city',
  },
  {
    slug: 'watersports-jobs-in-italy',
    title: 'Watersports Jobs in Italy',
    question: 'How many watersports jobs are in Italy?',
    description: 'Live count of open watersports jobs in Italy on Chickenloop.',
    countryCode: 'IT',
    filter: { country: 'IT' },
    tableType: 'city',
  },
];

export function getInsightBySlug(slug: string): InsightPageConfig | undefined {
  return INSIGHT_PAGES.find((page) => page.slug === slug);
}

export function getAllInsightSlugs(): InsightSlug[] {
  return INSIGHT_PAGES.map((page) => page.slug);
}
