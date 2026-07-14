'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { useAuth } from '@/app/contexts/AuthContext';
import { adminApi } from '@/lib/api';

interface SurveyStats {
  surveyId: string;
  title: string;
  description: string;
  summary: {
    recruitersSurveyed: number;
    completionRate: number;
    definitelyPayPercent: number;
    probablyPayPercent: number;
    priceAcceptancePercent: number;
    earlyAccessSignups: number;
  };
  problemRanking: {
    problemValue: string;
    problemLabel: string;
    responses: number;
    definitelyPay: number;
    probablyPay: number;
    earlyAccess: number;
    acceptanceRate: number;
  }[];
  pricingValidation: {
    pricePoint: number;
    numberShown: number;
    likelyToSubscribe: number;
    maybe: number;
    rejectedPrice: number;
    conversionPercent: number;
  };
  earlyAccessList: {
    id: string;
    company: string;
    recruiter: string;
    email: string;
    problem: string;
    problemLabel: string;
    likelyToSubscribe: boolean;
    earlyAccess: boolean;
    completedAt: string | null;
    createdAt: string;
  }[];
  magicWishResponses: {
    id: string;
    magicWish: string;
    problemCategory: string | null;
    problemLabel: string;
    company: string;
    recruiter: string;
    email: string;
    completedAt: string | null;
    createdAt: string;
  }[];
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function formatDescription(description: string) {
  return description.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
}

function downloadCsv(filename: string, rows: string[][]) {
  const escape = (cell: string) => `"${String(cell ?? '').replace(/"/g, '""')}"`;
  const csv = rows.map((row) => row.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminProductResearchPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [surveys, setSurveys] = useState<SurveyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [wishProblemFilter, setWishProblemFilter] = useState('');
  const [wishCompanyFilter, setWishCompanyFilter] = useState('');
  const [wishDateFrom, setWishDateFrom] = useState('');
  const [wishDateTo, setWishDateTo] = useState('');
  const [wishKeyword, setWishKeyword] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'admin') {
      router.push(`/${user.role === 'recruiter' ? 'recruiter' : 'job-seeker'}`);
    }
  }, [user, authLoading, router]);

  const loadSurveys = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminApi.getSurveyStats();
      setSurveys(data.surveys || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load survey stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadSurveys();
    }
  }, [user, loadSurveys]);

  const activeSurvey = surveys[0];

  const filteredWishes = useMemo(() => {
    if (!activeSurvey) return [];
    return activeSurvey.magicWishResponses.filter((row) => {
      if (wishProblemFilter && row.problemCategory !== wishProblemFilter) return false;
      if (
        wishCompanyFilter &&
        !row.company.toLowerCase().includes(wishCompanyFilter.toLowerCase())
      ) {
        return false;
      }
      const dateValue = row.completedAt || row.createdAt;
      if (wishDateFrom && new Date(dateValue) < new Date(wishDateFrom)) return false;
      if (wishDateTo) {
        const end = new Date(wishDateTo);
        end.setHours(23, 59, 59, 999);
        if (new Date(dateValue) > end) return false;
      }
      if (wishKeyword) {
        const haystack = `${row.magicWish} ${row.company} ${row.recruiter} ${row.email}`.toLowerCase();
        if (!haystack.includes(wishKeyword.toLowerCase())) return false;
      }
      return true;
    });
  }, [activeSurvey, wishProblemFilter, wishCompanyFilter, wishDateFrom, wishDateTo, wishKeyword]);

  const exportEarlyAccessCsv = () => {
    if (!activeSurvey) return;
    const rows = [
      ['Company', 'Recruiter', 'Email', 'Problem', 'Likely to Subscribe', 'Early Access', 'Completed At'],
      ...activeSurvey.earlyAccessList.map((row) => [
        row.company,
        row.recruiter,
        row.email,
        row.problemLabel,
        row.likelyToSubscribe ? 'Yes' : 'No',
        row.earlyAccess ? 'Yes' : 'No',
        row.completedAt || row.createdAt,
      ]),
    ];
    downloadCsv(`${activeSurvey.surveyId}-early-access.csv`, rows);
  };

  if (authLoading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link href="/admin" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            ← Back to Admin
          </Link>
          <button
            type="button"
            onClick={loadSurveys}
            className="text-sm font-medium text-gray-700 border border-gray-300 rounded-md px-3 py-1.5 bg-white hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Research</h1>
        <p className="text-gray-600 mb-8">
          Survey responses from recruiters used to validate future SaaS products and pricing.
        </p>

        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-600">Loading survey stats…</p>
        ) : !activeSurvey ? (
          <p className="text-gray-600">No surveys registered yet.</p>
        ) : (
          <div className="space-y-10">
            <section className="bg-white rounded-lg shadow-md p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{activeSurvey.title}</h2>
                <p className="text-sm text-gray-500 mt-1 font-mono">{activeSurvey.surveyId}</p>
                {formatDescription(activeSurvey.description).map((paragraph) => (
                  <p key={paragraph} className="text-gray-600 mt-2 text-sm">
                    {paragraph}
                  </p>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {[
                  { label: 'Recruiters Surveyed', value: activeSurvey.summary.recruitersSurveyed },
                  { label: 'Completion Rate', value: `${activeSurvey.summary.completionRate}%` },
                  { label: 'Definitely Pay %', value: `${activeSurvey.summary.definitelyPayPercent}%` },
                  { label: 'Probably Pay %', value: `${activeSurvey.summary.probablyPayPercent}%` },
                  { label: '€29 Acceptance %', value: `${activeSurvey.summary.priceAcceptancePercent}%` },
                  { label: 'Early Access Sign-ups', value: activeSurvey.summary.earlyAccessSignups },
                ].map((card) => (
                  <div key={card.label} className="rounded-lg border border-gray-200 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">{card.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Problem Ranking</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="py-2 pr-4 font-medium">Problem</th>
                      <th className="py-2 pr-4 font-medium">Responses</th>
                      <th className="py-2 pr-4 font-medium">Definitely Pay</th>
                      <th className="py-2 pr-4 font-medium">Probably Pay</th>
                      <th className="py-2 pr-4 font-medium">Early Access</th>
                      <th className="py-2 font-medium">Acceptance Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSurvey.problemRanking.map((row) => (
                      <tr key={row.problemValue} className="border-b border-gray-100">
                        <td className="py-2 pr-4 text-gray-800">{row.problemLabel}</td>
                        <td className="py-2 pr-4 font-medium text-gray-900">{row.responses}</td>
                        <td className="py-2 pr-4 text-gray-800">{row.definitelyPay}</td>
                        <td className="py-2 pr-4 text-gray-800">{row.probablyPay}</td>
                        <td className="py-2 pr-4 text-gray-800">{row.earlyAccess}</td>
                        <td className="py-2 font-medium text-gray-900">{row.acceptanceRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Pricing Validation</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Number shown €{activeSurvey.pricingValidation.pricePoint}/month
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {activeSurvey.pricingValidation.numberShown}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Likely to subscribe</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {activeSurvey.pricingValidation.likelyToSubscribe}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Maybe</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {activeSurvey.pricingValidation.maybe}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Rejected price</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {activeSurvey.pricingValidation.rejectedPrice}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Conversion %</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {activeSurvey.pricingValidation.conversionPercent}%
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-lg shadow-md p-6">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-xl font-bold text-gray-900">
                  Early Access List ({activeSurvey.earlyAccessList.length})
                </h3>
                <button
                  type="button"
                  onClick={exportEarlyAccessCsv}
                  disabled={activeSurvey.earlyAccessList.length === 0}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="py-2 pr-4 font-medium">Company</th>
                      <th className="py-2 pr-4 font-medium">Recruiter</th>
                      <th className="py-2 pr-4 font-medium">Email</th>
                      <th className="py-2 pr-4 font-medium">Problem</th>
                      <th className="py-2 pr-4 font-medium">Likely to Subscribe</th>
                      <th className="py-2 font-medium">Early Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSurvey.earlyAccessList.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100">
                        <td className="py-2 pr-4 text-gray-800">{row.company}</td>
                        <td className="py-2 pr-4 text-gray-800">{row.recruiter}</td>
                        <td className="py-2 pr-4 text-gray-800">{row.email}</td>
                        <td className="py-2 pr-4 text-gray-800">{row.problemLabel}</td>
                        <td className="py-2 pr-4 text-gray-800">
                          {row.likelyToSubscribe ? 'Yes' : 'No'}
                        </td>
                        <td className="py-2 text-gray-800">{row.earlyAccess ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                    {activeSurvey.earlyAccessList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-3 text-gray-500">
                          No early access sign-ups yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Magic Wish Responses ({filteredWishes.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Problem category
                  </label>
                  <select
                    value={wishProblemFilter}
                    onChange={(e) => setWishProblemFilter(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">All problems</option>
                    {activeSurvey.problemRanking.map((row) => (
                      <option key={row.problemValue} value={row.problemValue}>
                        {row.problemLabel}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
                  <input
                    type="text"
                    value={wishCompanyFilter}
                    onChange={(e) => setWishCompanyFilter(e.target.value)}
                    placeholder="Filter by company"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">From date</label>
                  <input
                    type="date"
                    value={wishDateFrom}
                    onChange={(e) => setWishDateFrom(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">To date</label>
                  <input
                    type="date"
                    value={wishDateTo}
                    onChange={(e) => setWishDateTo(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">Keyword search</label>
                <input
                  type="text"
                  value={wishKeyword}
                  onChange={(e) => setWishKeyword(e.target.value)}
                  placeholder="Search wish text, company, recruiter, email…"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="py-2 pr-4 font-medium">Date</th>
                      <th className="py-2 pr-4 font-medium">Company</th>
                      <th className="py-2 pr-4 font-medium">Problem</th>
                      <th className="py-2 font-medium">Magic wish</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWishes.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 align-top">
                        <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">
                          {formatDate(row.completedAt || row.createdAt)}
                        </td>
                        <td className="py-2 pr-4 text-gray-800">
                          <div>{row.company}</div>
                          <div className="text-xs text-gray-500">{row.recruiter}</div>
                        </td>
                        <td className="py-2 pr-4 text-gray-800">{row.problemLabel}</td>
                        <td className="py-2 text-gray-900 max-w-2xl">{row.magicWish}</td>
                      </tr>
                    ))}
                    {filteredWishes.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-3 text-gray-500">
                          No magic wish responses match these filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
