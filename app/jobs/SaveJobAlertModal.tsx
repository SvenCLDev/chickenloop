'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { JobListFilters } from '@/lib/jobs';
import { savedSearchesApi } from '@/lib/api';
import { buildDefaultAlertName, buildSavedSearchPayload } from './savedSearchUtils';

interface SaveJobAlertModalProps {
  open: boolean;
  filters: JobListFilters;
  alertNameLabels?: { category?: string; country?: string };
  description?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SaveJobAlertModal({
  open,
  filters,
  alertNameLabels,
  description = 'Get email notifications when new jobs match your current search filters.',
  onClose,
  onSuccess,
}: SaveJobAlertModalProps) {
  const [alertName, setAlertName] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('weekly');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setAlertName(buildDefaultAlertName(filters, alertNameLabels));
    setFrequency('weekly');
    setError('');
    setSaving(false);
  }, [open, filters, alertNameLabels]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = alertName.trim();
    if (!trimmedName) {
      setError('Please enter a name for your job alert');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await savedSearchesApi.create(buildSavedSearchPayload(filters, trimmedName, frequency));
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save job alert');
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
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Save Job Alert</h2>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="alert-name" className="block text-sm font-medium text-gray-700 mb-1">
              Alert name
            </label>
            <input
              id="alert-name"
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
              <label className="flex items-center gap-2 text-sm text-gray-900">
                <input
                  type="radio"
                  name="alert-frequency"
                  value="daily"
                  checked={frequency === 'daily'}
                  onChange={() => setFrequency('daily')}
                />
                Daily
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-900">
                <input
                  type="radio"
                  name="alert-frequency"
                  value="weekly"
                  checked={frequency === 'weekly'}
                  onChange={() => setFrequency('weekly')}
                />
                Weekly
              </label>
            </div>
          </fieldset>
          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-100 text-red-700 text-sm">{error}</div>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Save Alert'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface SaveJobAlertLoginPromptProps {
  open: boolean;
  onClose: () => void;
}

export function SaveJobAlertLoginPrompt({ open, onClose }: SaveJobAlertLoginPromptProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-3 text-gray-900">Sign in to save job alerts</h2>
        <p className="text-sm text-gray-600 mb-6">
          Login or register as a job seeker to create email alerts for jobs matching your search.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/login"
            className="flex-1 text-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold"
            onClick={onClose}
          >
            Login
          </Link>
          <Link
            href="/register"
            className="flex-1 text-center bg-gray-100 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-200 font-semibold border border-gray-300"
            onClick={onClose}
          >
            Register
          </Link>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full text-sm text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
