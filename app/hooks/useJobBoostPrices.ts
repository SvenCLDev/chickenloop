'use client';

import { useState, useEffect } from 'react';

export interface JobBoostPriceItem {
  lookupKey: string;
  durationDays: number;
  priceId: string;
  amount: number;
  currency: string;
  formattedPrice: string;
  productName: string;
}

export interface UseJobBoostPricesResult {
  prices: JobBoostPriceItem[];
  isLoading: boolean;
  error: string | null;
}

export function useJobBoostPrices(): UseJobBoostPricesResult {
  const [prices, setPrices] = useState<JobBoostPriceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPrices() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/stripe/job-boost-prices', {
          credentials: 'include',
        });
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          setError(typeof data?.error === 'string' ? data.error : 'Failed to load prices');
          setPrices([]);
          return;
        }

        if (Array.isArray(data)) {
          setPrices(data);
        } else {
          setPrices([]);
          setError('Invalid response');
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load prices');
        setPrices([]);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchPrices();
    return () => {
      cancelled = true;
    };
  }, []);

  return { prices, isLoading, error };
}
