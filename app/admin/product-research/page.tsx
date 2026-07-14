'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { useAuth } from '@/app/contexts/AuthContext';
import { adminApi } from '@/lib/api';

interface SurveyStats {
  surveyId: string;
  title: string;
  description: string;
  totalResponses: number;
  completedCount: number;
  dismissedCount: number;
  remindLaterCount: number;
  completionRate: number;
  primaryAnswerDistribution: { value: string; label: string; count: number }[];
  secondaryAnswerDistribution: { value: string; label: string; count: number }[];
  earlyAccessInterest: { yes: number; no: number; unknown: number };
  freeTextResponses: {
    id: string;
    freeText: string;
    primaryAnswer: string | null;
    secondaryAnswer: string | null;
    completedAt: string | null;
    createdAt: string;
  }[];
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export default function AdminProductResearchPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [surveys, setSurveys] = useState<SurveyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        <div className="mb-6">
          <Link href="/admin" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            ← Back to Admin
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Research</h1>
        <p className="text-gray-600 mb-8">
          Survey responses from recruiters used to validate future SaaS products.
        </p>

        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-600">Loading survey stats…</p>
        ) : surveys.length === 0 ? (
          <p className="text-gray-600">No surveys registered yet.</p>
        ) : (
          <div className="space-y-10">
            {surveys.map((survey) => (
              <section key={survey.surveyId} className="bg-white rounded-lg shadow-md p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">{survey.title}</h2>
                  <p className="text-sm text-gray-500 mt-1 font-mono">{survey.surveyId}</p>
                  {survey.description && (
                    <p className="text-gray-600 mt-2 text-sm">{survey.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Responses</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{survey.totalResponses}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Completed</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{survey.completedCount}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Completion rate</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{survey.completionRate}%</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Dismissed / Remind</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {survey.dismissedCount} / {survey.remindLaterCount}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Answer distribution</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-left text-gray-500">
                            <th className="py-2 pr-4 font-medium">Answer</th>
                            <th className="py-2 font-medium">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {survey.primaryAnswerDistribution.map((row) => (
                            <tr key={row.value} className="border-b border-gray-100">
                              <td className="py-2 pr-4 text-gray-800">{row.label}</td>
                              <td className="py-2 text-gray-900 font-medium">{row.count}</td>
                            </tr>
                          ))}
                          {survey.primaryAnswerDistribution.length === 0 && (
                            <tr>
                              <td colSpan={2} className="py-3 text-gray-500">
                                No completed answers yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Early access interest</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-left text-gray-500">
                            <th className="py-2 pr-4 font-medium">Response</th>
                            <th className="py-2 font-medium">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-gray-100">
                            <td className="py-2 pr-4 text-gray-800">Yes</td>
                            <td className="py-2 text-gray-900 font-medium">
                              {survey.earlyAccessInterest.yes}
                            </td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td className="py-2 pr-4 text-gray-800">No</td>
                            <td className="py-2 text-gray-900 font-medium">
                              {survey.earlyAccessInterest.no}
                            </td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td className="py-2 pr-4 text-gray-800">Unknown</td>
                            <td className="py-2 text-gray-900 font-medium">
                              {survey.earlyAccessInterest.unknown}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {survey.secondaryAnswerDistribution.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                          Secondary answer detail
                        </h4>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {survey.secondaryAnswerDistribution.map((row) => (
                            <li key={row.value}>
                              {row.label}: <span className="font-medium">{row.count}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Free-text responses ({survey.freeTextResponses.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-gray-500">
                          <th className="py-2 pr-4 font-medium">Date</th>
                          <th className="py-2 pr-4 font-medium">Primary</th>
                          <th className="py-2 pr-4 font-medium">Early access</th>
                          <th className="py-2 font-medium">Comment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {survey.freeTextResponses.map((row) => (
                          <tr key={row.id} className="border-b border-gray-100 align-top">
                            <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">
                              {formatDate(row.completedAt || row.createdAt)}
                            </td>
                            <td className="py-2 pr-4 text-gray-700">{row.primaryAnswer || '—'}</td>
                            <td className="py-2 pr-4 text-gray-700">{row.secondaryAnswer || '—'}</td>
                            <td className="py-2 text-gray-900 max-w-xl">{row.freeText}</td>
                          </tr>
                        ))}
                        {survey.freeTextResponses.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-3 text-gray-500">
                              No free-text responses yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
