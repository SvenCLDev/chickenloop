import Link from 'next/link';
import type { JobMarketStats } from '@/lib/jobMarketStats';
import type { InsightPageConfig } from '@/lib/insightsConfig';
import { buildJobsFilterHref } from '@/lib/insightsContent';

interface Props {
  config: InsightPageConfig;
  stats: JobMarketStats;
  answer: string;
}

export default function InsightPageContent({ config, stats, answer }: Props) {
  const updatedLabel = new Date(stats.generatedAt).toLocaleString('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="mb-6 text-sm">
          <Link href="/insights" className="text-blue-600 hover:text-blue-800">
            ← Job market insights
          </Link>
        </nav>

        <header className="mb-8">
          <p className="text-sm font-medium text-blue-700 mb-2">Live job market data</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{config.question}</h1>
          <p className="text-lg text-gray-700 leading-relaxed">{answer}</p>
          <p className="mt-3 text-sm text-gray-500">Last updated: {updatedLabel}</p>
        </header>

        <section className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Summary</h2>
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 py-5 text-sm">
            <div>
              <dt className="text-gray-500">Open jobs</dt>
              <dd className="text-2xl font-bold text-gray-900">{stats.totalPublishedJobs}</dd>
            </div>
            <div>
              <dt className="text-gray-500">New (7 days)</dt>
              <dd className="text-2xl font-bold text-gray-900">{stats.newJobsLast7Days}</dd>
            </div>
            <div>
              <dt className="text-gray-500">New (30 days)</dt>
              <dd className="text-2xl font-bold text-gray-900">{stats.newJobsLast30Days}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Featured</dt>
              <dd className="text-2xl font-bold text-gray-900">{stats.featuredJobs}</dd>
            </div>
          </dl>
        </section>

        {config.tableType === 'country' && (
          <InsightCountryTable rows={stats.byCountry} filter={config.filter} />
        )}

        {config.tableType === 'city' && (
          <InsightCityTable rows={stats.topCities} countryCode={config.countryCode} />
        )}

        {config.tableType === 'employmentType' && (
          <InsightCountTable
            title="Jobs by employment type"
            rows={stats.byEmploymentType}
            buildHref={(row) => buildJobsFilterHref({ employmentType: row.value })}
          />
        )}

        {config.tableType === 'categorySport' && (
          <>
            <InsightCountTable
              title="Jobs by role category"
              rows={stats.byCategory}
              buildHref={(row) => buildJobsFilterHref({ category: row.value })}
            />
            <div className="mt-8">
              <InsightCountTable
                title="Jobs by sport / activity"
                rows={stats.bySport}
                buildHref={(row) => buildJobsFilterHref({ activity: row.value })}
              />
            </div>
          </>
        )}

        <section className="mt-10 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Browse live listings</h2>
          <p className="text-gray-600 mb-4">
            These numbers come from published jobs on Chickenloop. Browse current openings to apply.
          </p>
          <Link
            href={buildJobsFilterHref(buildDefaultFilter(config))}
            className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            View matching jobs →
          </Link>
        </section>

        <section className="mt-8 text-sm text-gray-600">
          <p>
            More insights:{' '}
            <Link href="/insights/watersports-jobs-by-country" className="text-blue-600 hover:underline">
              jobs by country
            </Link>
            {' · '}
            <Link href="/insights/kitesurfing-jobs-by-country" className="text-blue-600 hover:underline">
              kitesurfing instructor jobs
            </Link>
            {' · '}
            <Link href="/career-advice" className="text-blue-600 hover:underline">
              career guides
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}

function buildDefaultFilter(config: InsightPageConfig): Record<string, string> {
  const params: Record<string, string> = {};
  if (config.filter?.country) params.country = config.filter.country;
  if (config.filter?.sport) params.activity = config.filter.sport;
  if (config.filter?.category) params.category = config.filter.category;
  return params;
}

function InsightCountryTable({
  rows,
  filter,
}: {
  rows: JobMarketStats['byCountry'];
  filter?: InsightPageConfig['filter'];
}) {
  return (
    <InsightCountTable
      title="Jobs by country"
      rows={rows.map((row) => ({ value: row.code, label: row.label, count: row.count }))}
      buildHref={(row) => {
        const params: Record<string, string> = { country: row.value };
        if (filter?.sport) params.activity = filter.sport;
        if (filter?.category) params.category = filter.category;
        return buildJobsFilterHref(params);
      }}
      columns={['Country', 'Open jobs', '']}
      labelKey="label"
    />
  );
}

function InsightCityTable({
  rows,
  countryCode,
}: {
  rows: JobMarketStats['topCities'];
  countryCode?: string;
}) {
  if (rows.length === 0) {
    return (
      <section className="bg-white rounded-lg shadow-md p-6 text-gray-600">
        No city-level listings available for this country yet.
      </section>
    );
  }

  return (
    <section className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900">Jobs by city</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-6 py-3 font-medium">City</th>
              <th className="px-6 py-3 font-medium">Country</th>
              <th className="px-6 py-3 font-medium">Open jobs</th>
              <th className="px-6 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={`${row.city}-${row.country}`}>
                <td className="px-6 py-3 text-gray-900">{row.city}</td>
                <td className="px-6 py-3 text-gray-700">{row.countryLabel}</td>
                <td className="px-6 py-3 font-semibold text-gray-900">{row.count}</td>
                <td className="px-6 py-3">
                  <Link
                    href={buildJobsFilterHref({
                      country: countryCode || row.country,
                      city: row.city,
                    })}
                    className="text-blue-600 hover:underline"
                  >
                    View jobs
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function InsightCountTable({
  title,
  rows,
  buildHref,
  columns = ['Category', 'Open jobs', ''],
  labelKey = 'label',
}: {
  title: string;
  rows: { value: string; label: string; count: number }[];
  buildHref: (row: { value: string; label: string; count: number }) => string;
  columns?: [string, string, string];
  labelKey?: 'label' | 'value';
}) {
  if (rows.length === 0) {
    return (
      <section className="bg-white rounded-lg shadow-md p-6 text-gray-600">
        No data available for this breakdown yet.
      </section>
    );
  }

  return (
    <section className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-6 py-3 font-medium">{columns[0]}</th>
              <th className="px-6 py-3 font-medium">{columns[1]}</th>
              <th className="px-6 py-3 font-medium">{columns[2]}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.value}>
                <td className="px-6 py-3 text-gray-900">{row[labelKey]}</td>
                <td className="px-6 py-3 font-semibold text-gray-900">{row.count}</td>
                <td className="px-6 py-3">
                  <Link href={buildHref(row)} className="text-blue-600 hover:underline">
                    View jobs
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
