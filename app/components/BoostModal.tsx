'use client';

import React, { useState } from 'react';
import { useBoostPrices, type BoostPriceItem } from '@/app/hooks/useBoostPrices';

function badgeForDays(days: number): string | null {
  if (days === 14) return '⭐ Recommended';
  if (days === 30) return 'Best value';
  return null;
}

export interface BoostModalProps {
  type: 'job' | 'cv';
  entityId: string;
  currentFeaturedUntil?: string | null;
  onClose: () => void;
  /** Optional title. Default: "Feature this job" for job, "Boost your CV" for cv. */
  title?: string;
}

export default function BoostModal({
  type,
  entityId,
  currentFeaturedUntil,
  onClose,
  title: titleProp,
}: BoostModalProps) {
  const { prices, isLoading: pricesLoading, error: pricesError } = useBoostPrices(type);
  const [selectedDurationDays, setSelectedDurationDays] = useState<number>(14);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = titleProp ?? (type === 'job' ? 'Feature this job' : 'Boost your CV');

  const handleContinue = async () => {
    setLoading(true);
    setError(null);
    try {
      if (type === 'job') {
        const lookupKey = `featured_job_${selectedDurationDays}`;
        const res = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            targetType: 'job',
            targetId: entityId,
            lookupKey,
          }),
        });
        const text = await res.text();
        let data: { checkoutUrl?: string; error?: string } = {};
        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            setError(res.ok ? 'Invalid response from server' : text || res.statusText || 'Failed to create checkout session');
            return;
          }
        }
        if (!res.ok) throw new Error(data.error || text || res.statusText || 'Failed to create checkout session');
        const checkoutUrl = data.checkoutUrl;
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
          return;
        }
        throw new Error('No checkout URL returned');
      } else {
        const selectedPrice = prices.find((p) => p.durationDays === selectedDurationDays);
        if (!selectedPrice?.priceId) {
          setError('Please select a boost option');
          return;
        }
        const res = await fetch('/api/stripe/cv-boost/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            priceId: selectedPrice.priceId,
            cvId: entityId,
            ...(selectedDurationDays != null && { boostDurationDays: selectedDurationDays }),
          }),
        });
        const text = await res.text();
        let data: { checkoutUrl?: string; error?: string } = {};
        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            setError(res.ok ? 'Invalid response from server' : text || res.statusText || 'Failed to create checkout session');
            return;
          }
        }
        if (!res.ok) throw new Error(data.error || text || res.statusText || 'Failed to create checkout session');
        const checkoutUrl = data.checkoutUrl;
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
          return;
        }
        throw new Error('No checkout URL returned');
      }
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

  const hasValidSelection = prices.some((p) => p.durationDays === selectedDurationDays);
  const confirmDisabled = pricesLoading || loading || prices.length === 0 || !hasValidSelection;

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
        aria-labelledby="boost-modal-title"
      >
        <div className="flex justify-between items-start mb-6">
          <h2 id="boost-modal-title" className="text-2xl font-bold text-gray-900">
            {title}
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

        {pricesError ? (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            Unable to load prices. Please try again later.
          </div>
        ) : pricesLoading ? (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm">
            Loading prices…
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {prices.map((price: BoostPriceItem) => {
              const badge = badgeForDays(price.durationDays);
              return (
                <button
                  key={price.lookupKey}
                  type="button"
                  onClick={() => setSelectedDurationDays(price.durationDays)}
                  disabled={loading}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border-2 text-left transition-colors disabled:opacity-50 ${
                    selectedDurationDays === price.durationDays
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <span className="font-medium text-gray-900">
                    Boost for {price.durationDays} days
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold text-gray-900">
                      {price.formattedPrice}
                    </span>
                    {badge && (
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          badge.includes('Recommended')
                            ? 'bg-blue-600 text-white'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}

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
            disabled={confirmDisabled}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Redirecting...' : 'Continue to payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
