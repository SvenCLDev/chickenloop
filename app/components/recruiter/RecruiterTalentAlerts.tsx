'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { talentSavedSearchesApi } from '@/lib/api';
import { buildCandidateSearchUrl } from '@/lib/candidateSearchParams';
import type { CandidateSearchParams } from '@/lib/candidateSearchParams';

type TalentSavedSearchRow = {
  _id: string;
  id?: string;
  name: string;
  filters: CandidateSearchParams;
  frequency: 'immediate' | 'daily' | 'weekly' | 'never';
  active: boolean;
  lastSentAt?: string;
  filterChips?: { label: string; value: string }[];
};

export default function RecruiterTalentAlerts() {
  const [searches, setSearches] = useState<TalentSavedSearchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editFrequency, setEditFrequency] = useState<TalentSavedSearchRow['frequency']>('daily');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await talentSavedSearchesApi.getAll();
      setSearches(data.savedSearches || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load talent alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const searchId = (row: TalentSavedSearchRow) => row.id || row._id;

  const toggleActive = async (row: TalentSavedSearchRow) => {
    const id = searchId(row);
    setBusyId(id);
    try {
      await talentSavedSearchesApi.update(id, { active: !row.active });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update alert');
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (row: TalentSavedSearchRow) => {
    setEditingId(searchId(row));
    setEditName(row.name);
    setEditFrequency(row.frequency);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setBusyId(editingId);
    try {
      await talentSavedSearchesApi.update(editingId, {
        name: editName.trim(),
        frequency: editFrequency,
      });
      setEditingId(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (row: TalentSavedSearchRow) => {
    const id = searchId(row);
    if (!window.confirm(`Delete talent alert “${row.name}”?`)) return;
    setBusyId(id);
    try {
      await talentSavedSearchesApi.delete(id);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete alert');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Talent Alerts</h2>
          <p className="mt-1 text-sm text-gray-600">
            Saved Talent Network searches and email notification settings.
          </p>
        </div>
        <Link
          href="/talent"
          className="text-sm font-semibold text-blue-600 hover:underline"
        >
          Browse talent to save a search →
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-gray-600">Loading alerts…</div>
      ) : searches.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600">You have no saved Talent Alerts yet.</p>
          <p className="text-gray-500 text-sm mt-2">
            Apply filters on the Talent Network page, then click Save Search.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Filters
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Frequency
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Last sent
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {searches.map((row) => {
                  const id = searchId(row);
                  const openHref = buildCandidateSearchUrl('/talent', row.filters || {});
                  return (
                    <tr key={id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {editingId === id ? (
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                          />
                        ) : (
                          <Link href={openHref} className="text-blue-600 hover:underline">
                            {row.name}
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(row.filterChips || []).slice(0, 4).map((chip) => (
                            <span
                              key={`${chip.label}-${chip.value}`}
                              className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                            >
                              {chip.label}: {chip.value}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 capitalize">
                        {editingId === id ? (
                          <select
                            value={editFrequency}
                            onChange={(e) =>
                              setEditFrequency(
                                e.target.value as TalentSavedSearchRow['frequency']
                              )
                            }
                            className="rounded border border-gray-300 px-2 py-1 text-sm"
                          >
                            <option value="immediate">Immediate</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="never">Off</option>
                          </select>
                        ) : (
                          row.frequency
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            row.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {row.active ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {row.lastSentAt
                          ? new Date(row.lastSentAt).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-2">
                          {editingId === id ? (
                            <>
                              <button
                                type="button"
                                disabled={busyId === id}
                                onClick={() => void saveEdit()}
                                className="text-blue-600 hover:underline disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="text-gray-600 hover:underline"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(row)}
                                className="text-blue-600 hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={busyId === id}
                                onClick={() => void toggleActive(row)}
                                className="text-amber-700 hover:underline disabled:opacity-50"
                              >
                                {row.active ? 'Pause' : 'Resume'}
                              </button>
                              <button
                                type="button"
                                disabled={busyId === id}
                                onClick={() => void remove(row)}
                                className="text-red-600 hover:underline disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
