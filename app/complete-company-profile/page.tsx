'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getCountryNameFromCode,
  normalizeCountryForStorage,
  COUNTRY_OPTIONS,
} from '@/lib/countryUtils';

export default function CompleteCompanyProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reasonParam = searchParams.get('reason');
  const [description, setDescription] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user && user.role !== 'recruiter') {
      router.push(`/${user.role === 'admin' ? 'admin' : 'job-seeker'}`);
      return;
    }
    if (user && user.role === 'recruiter') {
      loadCompany();
    }
  }, [user, authLoading, router]);

  const loadCompany = async () => {
    try {
      const res = await fetch('/api/company/for-complete-profile', {
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 404) {
          router.push('/recruiter/company/new');
          return;
        }
        throw new Error(data.error || 'Failed to load company');
      }

      const company = data.company;
      setDescription(
        typeof company.description === 'string'
          ? company.description.replace(/<[^>]*>/g, '').trim()
          : ''
      );
      setCountry(
        company.address?.country
          ? getCountryNameFromCode(company.address.country)
          : ''
      );
      setCity(company.address?.city || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load company');
      if (err instanceof Error && err.message.includes('401')) {
        router.push('/login');
      }
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const descTrimmed = description.trim();
    if (descTrimmed.length < 50) {
      setError('Description must be at least 50 characters');
      return;
    }
    if (!country.trim()) {
      setError('Country is required');
      return;
    }
    if (!city.trim()) {
      setError('City is required');
      return;
    }

    const countryCode = normalizeCountryForStorage(country);
    if (!countryCode) {
      setError('Please select a valid country');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/company/for-complete-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          description: descTrimmed,
          address: {
            country: countryCode,
            city: city.trim(),
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update company');
      }

      router.replace('/recruiter');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update company');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Complete Your Company Profile
          </h1>
          <p className="text-gray-600 text-sm mb-6">
            Please add the following details to continue.
          </p>

          {reasonParam && (
            <div
              className="mb-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm"
              role="alert"
            >
              {reasonParam}
            </div>
          )}

          {error && (
            <div
              className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm"
              role="alert"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                minLength={50}
                placeholder="Describe your company (at least 50 characters)..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                {description.trim().length}/50 characters minimum
              </p>
            </div>

            <div>
              <label
                htmlFor="country"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Country <span className="text-red-500">*</span>
              </label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                required
              >
                <option value="">Select a country</option>
                {COUNTRY_OPTIONS.map(({ code, name }) => (
                  <option key={code} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="city"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                City <span className="text-red-500">*</span>
              </label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. London"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-md font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : 'Save and Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
