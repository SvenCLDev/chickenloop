'use client';

import { useState, useEffect } from 'react';

export interface BoostPriceItem {
  lookupKey: string;
  durationDays: number;
  priceId: string;
  amount: number;
  currency: string;
  formattedPrice: string;
  productName: string;
}

export interface UseBoostPricesResult {
  prices: BoostPriceItem[];
  isLoading: boolean;
  error: string | null;
}

const ENDPOINTS = {
  job: '/api/stripe/job-boost-prices',
  cv: '/api/stripe/cv-boost-prices',
} as const;

export function useBoostPrices(type: 'job' | 'cv'): UseBoostPricesResult {
  const [prices, setPrices] = useState<BoostPriceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const endpoint = ENDPOINTS[type];

    async function fetchPrices() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(endpoint, { credentials: 'include' });
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
  }, [type]);

  return { prices, isLoading, error };
}
