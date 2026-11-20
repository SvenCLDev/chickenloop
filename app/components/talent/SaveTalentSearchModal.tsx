'use client';

import { useEffect, useState } from 'react';
import type { CandidateSearchParams } from '@/lib/candidateSearchParams';
import { hasActiveFilters } from '@/lib/candidateSearchParams';
import { talentSavedSearchesApi } from '@/lib/api';
import { buildDefaultTalentAlertName } from '@/lib/talentAlerts/sanitizeFilters';

type Frequency = 'immediate' | 'daily' | 'weekly' | 'never';

type SaveTalentSearchModalProps = {
  open: boolean;
  filters: CandidateSearchParams;
  onClose: () => void;
  onSuccess: () => void;
};

export default function SaveTalentSearchModal({
  open,
  filters,
  onClose,
  onSuccess,
}: SaveTalentSearchModalProps) {
  const [alertName, setAlertName] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setAlertName(buildDefaultTalentAlertName(filters));
    setFrequency('daily');
    setError('');
    setSaving(false);
  }, [open, filters]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = alertName.trim();
    if (!trimmedName) {
      setError('Please enter a name for this talent alert');
      return;
    }
    if (!hasActiveFilters(filters)) {
      setError('Add at least one filter before saving a search');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await talentSavedSearchesApi.create({
        name: trimmedName,
        filters,
        frequency,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save talent alert');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Save Talent Search</h2>
        <p className="text-sm text-gray-600 mb-4">
          Get email notifications when new Talent Network profiles match these filters.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="talent-alert-name" className="block text-sm font-medium text-gray-700 mb-1">
              Alert name
            </label>
            <input
              id="talent-alert-name"
              type="text"
              value={alertName}
              onChange={(e) => setAlertName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            />
          </div>
          <fieldset className="mb-4">
            <legend className="block text-sm font-medium text-gray-700 mb-2">Frequency</legend>
            <div className="space-y-2">
              {(
                [
                  ['immediate', 'Immediate'],
                  ['daily', 'Daily'],
                  ['weekly', 'Weekly'],
                  ['never', 'Off (save only)'],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm text-gray-900">
                  <input
                    type="radio"
                    name="talent-alert-frequency"
                    value={value}
                    checked={frequency === value}
                    onChange={() => setFrequency(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-100 text-red-700 text-sm">{error}</div>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save alert'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-200 font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
