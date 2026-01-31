'use client';

import React, { useState } from 'react';

const DURATION_OPTIONS: { days: 7 | 14 | 30; label: string; badge?: string }[] = [
  { days: 7, label: '7 days' },
  { days: 14, label: '14 days', badge: 'Recommended' },
  { days: 30, label: '30 days', badge: 'Best value' },
];

const DURATION_TO_PRODUCT_KEY: Record<7 | 14 | 30, string> = {
  7: 'FEATURED_JOB_7_DAYS',
  14: 'FEATURED_JOB_14_DAYS',
  30: 'FEATURED_JOB_30_DAYS',
};

export interface FeatureJobModalProps {
  jobId: string;
  currentFeaturedUntil?: string | null;
  onClose: () => void;
}

export default function FeatureJobModal({
  jobId,
  currentFeaturedUntil,
  onClose,
}: FeatureJobModalProps) {
  const [selectedDuration, setSelectedDuration] = useState<7 | 14 | 30>(14);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    setLoading(true);
    setError(null);
    try {
      const productKey = DURATION_TO_PRODUCT_KEY[selectedDuration];
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productKey,
          entityType: 'job',
          entityId: jobId,
        }),
      });
      const text = await res.text();
      let data: { url?: string; error?: string } = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          setError(res.ok ? 'Invalid response from server' : text || res.statusText || 'Failed to create checkout session');
          return;
        }
      }
      if (!res.ok) throw new Error(data.error || text || res.statusText || 'Failed to create checkout session');
      const checkoutUrl = data.url;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
      throw new Error('No checkout URL returned');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  const featuredUntilDate = currentFeaturedUntil
    ? (() => {
        try {
          const d = new Date(currentFeaturedUntil);
          return isNaN(d.getTime()) ? currentFeaturedUntil : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
        } catch {
          return currentFeaturedUntil;
        }
      })()
    : null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feature-job-modal-title"
      >
        <div className="flex justify-between items-start mb-6">
          <h2 id="feature-job-modal-title" className="text-2xl font-bold text-gray-900">
            Feature this job
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {currentFeaturedUntil && featuredUntilDate && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900">
              Currently featured until {featuredUntilDate}
            </p>
            <p className="text-sm text-blue-700 mt-1">
              New end date will be calculated after purchase.
            </p>
          </div>
        )}

        <p className="text-sm text-gray-600 mb-4">Choose boost duration:</p>
        <div className="space-y-3 mb-6">
          {DURATION_OPTIONS.map(({ days, label, badge }) => (
            <button
              key={days}
              type="button"
              onClick={() => setSelectedDuration(days)}
              disabled={loading}
              className={`w-full flex items-center justify-between p-4 rounded-lg border-2 text-left transition-colors disabled:opacity-50 ${
                selectedDuration === days
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <span className="font-medium text-gray-900">{label}</span>
              {badge && (
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded ${
                    badge === 'Recommended'
                      ? 'bg-blue-600 text-white'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Redirecting...' : 'Continue to payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
