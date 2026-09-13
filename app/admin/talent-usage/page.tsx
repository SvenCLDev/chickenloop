'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { useAuth } from '@/app/contexts/AuthContext';
import { adminApi } from '@/lib/api';

type PeriodDays = 7 | 30 | 90;

interface TalentUsageSummary {
  uniqueRecruitersSearching: number;
  totalSearches: number;
  totalSearchPages: number;
  totalProfileViews: number;
  avgSearchesPerActiveRecruiter: number;
  searchToViewRate: number;
}

interface TalentUsageStats {
  days: PeriodDays;
  includeAdmin: boolean;
  period: { from: string; to: string };
  priorPeriod: { from: string; to: string };
  summary: TalentUsageSummary;
  priorSummary: TalentUsageSummary;
  deltas: {
    uniqueRecruitersSearching: number | null;
    totalSearches: number | null;
    totalProfileViews: number | null;
    avgSearchesPerActiveRecruiter: number | null;
    searchToViewRate: number | null;
  };
  daily: Array<{
    date: string;
    searches: number;
    uniqueRecruiters: number;
    profileViews: number;
  }>;
  topFilters: Array<{ key: string; label: string; count: number }>;
  topKeywords: Array<{ keyword: string; count: number }>;
  topRecruiters: Array<{
    recruiterId: string;
    name: string;
    email: string;
    searches: number;
    profileViews: number;
  }>;
}

function formatDelta(value: number | null): string {
  if (value == null) return 'n/a';
  if (value === 0) return '0%';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}%`;
}

function deltaClass(value: number | null): string {
  if (value == null || value === 0) return 'text-gray-500';
  return value > 0 ? 'text-emerald-600' : 'text-red-600';
}

function formatRate(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`;
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AdminTalentUsagePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [days, setDays] = useState<PeriodDays>(30);
  const [includeAdmin, setIncludeAdmin] = useState(false);
  const [stats, setStats] = useState<TalentUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'admin') {
      router.push(`/${user.role === 'recruiter' ? 'recruiter' : 'job-seeker'}`);
    }
  }, [user, authLoading, router]);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = (await adminApi.getTalentUsageStats({
        days,
        includeAdmin,
      })) as TalentUsageStats;
      setStats(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load talent usage stats');
    } finally {
      setLoading(false);
    }
  }, [days, includeAdmin]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadStats();
    }
  }, [user, loadStats]);

  if (authLoading || (user && user.role !== 'admin' && !error)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <div className="text-xl text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  const summaryCards = stats
    ? [
        {
          label: 'Unique recruiters searching',
          value: String(stats.summary.uniqueRecruitersSearching),
          prior: String(stats.priorSummary.uniqueRecruitersSearching),
          delta: stats.deltas.uniqueRecruitersSearching,
        },
        {
          label: 'Talent searches',
          value: String(stats.summary.totalSearches),
          prior: String(stats.priorSummary.totalSearches),
          delta: stats.deltas.totalSearches,
        },
        {
          label: 'Profile views',
          value: String(stats.summary.totalProfileViews),
          prior: String(stats.priorSummary.totalProfileViews),
          delta: stats.deltas.totalProfileViews,
        },
        {
          label: 'Avg searches / active recruiter',
          value: String(stats.summary.avgSearchesPerActiveRecruiter),
          prior: String(stats.priorSummary.avgSearchesPerActiveRecruiter),
          delta: stats.deltas.avgSearchesPerActiveRecruiter,
        },
        {
          label: 'Search → view rate',
          value: formatRate(stats.summary.searchToViewRate),
          prior: formatRate(stats.priorSummary.searchToViewRate),
          delta: stats.deltas.searchToViewRate,
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-6">
          <Link href="/admin" className="text-sm text-blue-600 hover:underline">
            ← Back to admin
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Talent search usage</h1>
          <p className="text-gray-600 mt-2 max-w-3xl">
            First-party metrics for how intensely recruiters search and view talent profiles.
            Use the period toggle and prior-period deltas as a baseline when judging marketing
            or product changes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="inline-flex rounded-md border border-gray-300 bg-white overflow-hidden">
            {([7, 30, 90] as PeriodDays[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDays(option)}
                className={`px-4 py-2 text-sm font-medium ${
                  days === option
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {option} days
              </button>
            ))}
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={includeAdmin}
              onChange={(e) => setIncludeAdmin(e.target.checked)}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
            />
            Include admin browsing
          </label>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading && !stats ? (
          <div className="text-gray-600">Loading stats...</div>
        ) : stats ? (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Current: {formatShortDate(stats.period.from)} – {formatShortDate(stats.period.to)}.
              Prior: {formatShortDate(stats.priorPeriod.from)} –{' '}
              {formatShortDate(stats.priorPeriod.to)}.
              {stats.summary.totalSearchPages > 0
                ? ` Pagination loads: ${stats.summary.totalSearchPages}.`
                : ''}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              {summaryCards.map((card) => (
                <div key={card.label} className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
                  <p className="text-sm font-medium text-gray-600">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Prior: {card.prior}{' '}
                    <span className={deltaClass(card.delta)}>({formatDelta(card.delta)})</span>
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Daily activity</h2>
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">Searches</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">
                        Unique recruiters
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">
                        Profile views
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[...stats.daily].reverse().map((row) => (
                      <tr key={row.date}>
                        <td className="px-4 py-2 text-gray-900">{row.date}</td>
                        <td className="px-4 py-2 text-right text-gray-900">{row.searches}</td>
                        <td className="px-4 py-2 text-right text-gray-900">
                          {row.uniqueRecruiters}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-900">{row.profileViews}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Top filters used</h2>
                  <p className="text-sm text-gray-500 mt-1">On talent searches in this period</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Filter</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">Searches</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stats.topFilters.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="px-4 py-6 text-center text-gray-500">
                            No filtered searches yet
                          </td>
                        </tr>
                      ) : (
                        stats.topFilters.map((row) => (
                          <tr key={row.key}>
                            <td className="px-4 py-2 text-gray-900">{row.label}</td>
                            <td className="px-4 py-2 text-right text-gray-900">{row.count}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Top keywords</h2>
                  <p className="text-sm text-gray-500 mt-1">Keyword field on searches</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Keyword</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">Searches</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stats.topKeywords.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="px-4 py-6 text-center text-gray-500">
                            No keyword searches yet
                          </td>
                        </tr>
                      ) : (
                        stats.topKeywords.map((row) => (
                          <tr key={row.keyword}>
                            <td className="px-4 py-2 text-gray-900">{row.keyword}</td>
                            <td className="px-4 py-2 text-right text-gray-900">{row.count}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Most active recruiters</h2>
                <p className="text-sm text-gray-500 mt-1">By search count in this period</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Recruiter</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">Searches</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">
                        Profile views
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.topRecruiters.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                          No recruiter activity yet
                        </td>
                      </tr>
                    ) : (
                      stats.topRecruiters.map((row) => (
                        <tr key={row.recruiterId}>
                          <td className="px-4 py-2 text-gray-900">{row.name}</td>
                          <td className="px-4 py-2 text-gray-900">{row.email}</td>
                          <td className="px-4 py-2 text-right text-gray-900">{row.searches}</td>
                          <td className="px-4 py-2 text-right text-gray-900">
                            {row.profileViews}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
