import type { JobMarketStats } from '@/lib/jobMarketStats';
import type { InsightPageConfig } from '@/lib/insightsConfig';
import { getCountryNameFromCode } from '@/lib/countryUtils';

function formatTopCountries(stats: JobMarketStats, limit = 3): string {
  const top = stats.byCountry.slice(0, limit);
  if (top.length === 0) return 'No open listings at this time.';
  return top.map((row) => `${row.label} (${row.count})`).join(', ');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function buildInsightAnswer(config: InsightPageConfig, stats: JobMarketStats): string {
  const dateLabel = formatDate(stats.generatedAt);
  const total = stats.totalPublishedJobs;

  switch (config.slug) {
    case 'watersports-jobs-by-country': {
      const leaders = formatTopCountries(stats);
      return `As of ${dateLabel}, Chickenloop lists ${total} open watersports jobs worldwide. The countries with the most openings are ${leaders}.`;
    }
    case 'kitesurfing-jobs-by-country': {
      const leaders = formatTopCountries(stats);
      return `As of ${dateLabel}, Chickenloop lists ${total} open kitesurfing instructor jobs. The countries with the most openings are ${leaders}.`;
    }
    case 'jobs-by-category-and-sport': {
      const topCategory = stats.byCategory[0];
      const topSport = stats.bySport[0];
      const categoryPart = topCategory
        ? `${topCategory.label} (${topCategory.count} jobs)`
        : 'no dominant category';
      const sportPart = topSport ? `${topSport.label} (${topSport.count} jobs)` : 'no dominant sport';
      return `As of ${dateLabel}, Chickenloop lists ${total} open watersports jobs. The most common role category is ${categoryPart}, and the most listed sport is ${sportPart}.`;
    }
    case 'employment-types': {
      const top = stats.byEmploymentType.slice(0, 3);
      const breakdown =
        top.length > 0
          ? top.map((row) => `${row.label} (${row.count})`).join(', ')
          : 'no employment type data';
      return `As of ${dateLabel}, Chickenloop lists ${total} open watersports jobs. Employment type breakdown: ${breakdown}.`;
    }
    case 'watersports-jobs-in-spain':
    case 'watersports-jobs-in-greece':
    case 'watersports-jobs-in-italy': {
      const countryName = config.countryCode
        ? getCountryNameFromCode(config.countryCode)
        : 'this country';
      const topCities = stats.topCities
        .slice(0, 3)
        .map((row) => `${row.city} (${row.count})`)
        .join(', ');
      const cityPart = topCities ? ` Top cities: ${topCities}.` : '';
      return `As of ${dateLabel}, Chickenloop lists ${total} open watersports jobs in ${countryName}.${cityPart}`;
    }
    default:
      return `As of ${dateLabel}, Chickenloop lists ${total} open watersports jobs.`;
  }
}

export function buildJobsFilterHref(params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  return `/jobs?${search.toString()}`;
}
