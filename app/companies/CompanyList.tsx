'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCountryNameFromCode } from '@/lib/countryUtils';
import { getCompanyUrl } from '@/lib/companySlug';
import { stripHtmlToText } from '@/lib/sanitizeText';
import { isBlobStorageUrl } from '@/lib/imageUtils';
import type { CompanyListFilters, CompanyListItem } from '@/lib/companiesList';

const PAGE_SIZE = 20;

function isValidImageSrc(src: unknown): src is string {
  if (typeof src !== 'string') return false;
  const s = src.trim();
  if (s.length === 0) return false;
  if (s.startsWith('/')) return s.length > 1;
  if (s.startsWith('http://') || s.startsWith('https://')) {
    try {
      new URL(s);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

function getTagline(description?: string): string {
  if (!description) return '';
  const plain = stripHtmlToText(description);
  return plain.length > 100 ? plain.substring(0, 100) + '...' : plain;
}

function buildFilterQuery(page: number, filters: CompanyListFilters): string {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(PAGE_SIZE));
  if (filters.keyword?.trim()) params.set('keyword', filters.keyword.trim());
  if (filters.country?.trim()) params.set('country', filters.country.trim());
  return params.toString();
}

export default function CompanyList() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMoreState, setHasMoreState] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<CompanyListFilters>({ keyword: '', country: '' });
  const [keywordInput, setKeywordInput] = useState('');
  const [availableCountryCodes, setAvailableCountryCodes] = useState<string[]>([]);
  const observerRef = useRef<HTMLDivElement | null>(null);
  const loadedPagesRef = useRef<Set<number>>(new Set());
  const hasMountedRef = useRef(false);

  useEffect(() => {
    const keywordParam = searchParams?.get('keyword');
    const countryParam = searchParams?.get('country');
    const nextKeyword = keywordParam ? decodeURIComponent(keywordParam) : '';
    const nextCountry = countryParam ? decodeURIComponent(countryParam) : '';
    setFilters((prev) => {
      if (prev.keyword === nextKeyword && prev.country === nextCountry) return prev;
      return { keyword: nextKeyword, country: nextCountry };
    });
    setKeywordInput(nextKeyword);
  }, [searchParams]);

  const loadCompanies = useCallback(
    async (pageToLoad: number, activeFilters: CompanyListFilters, replace = false) => {
      setLoading(true);
      setError('');

      try {
        const query = buildFilterQuery(pageToLoad, activeFilters);
        const res = await fetch(`/api/companies?${query}`);
        if (!res.ok) {
          if (replace) {
            setCompanies([]);
            setTotalCount(0);
          }
          setHasMoreState(false);
          throw new Error('Failed to fetch companies');
        }

        const data = await res.json();
        const nextCompanies: CompanyListItem[] = Array.isArray(data.companies) ? data.companies : [];
        const nextHasMore = Boolean(data.hasMore);
        const nextTotalCount =
          typeof data.totalCount === 'number' ? data.totalCount : nextCompanies.length;
        const nextAvailableCountries: string[] = Array.isArray(data.availableCountries)
          ? data.availableCountries
              .map((country: unknown) => String(country || '').trim().toUpperCase())
              .filter(Boolean)
          : [];

        if (nextAvailableCountries.length > 0) {
          setAvailableCountryCodes(Array.from(new Set(nextAvailableCountries)));
        }

        if (replace) {
          setCompanies(nextCompanies);
          loadedPagesRef.current = new Set([pageToLoad]);
        } else if (nextCompanies.length > 0) {
          loadedPagesRef.current.add(pageToLoad);
          setCompanies((prev) => {
            const seen = new Set(prev.map((company) => company.id));
            const deduped = nextCompanies.filter((company) => !seen.has(company.id));
            return [...prev, ...deduped];
          });
        }

        setTotalCount(nextTotalCount);
        setHasMoreState(nextHasMore);
        setPage(pageToLoad);

        const pushParams = new URLSearchParams();
        pushParams.set('page', String(pageToLoad));
        if (activeFilters.keyword?.trim()) pushParams.set('keyword', activeFilters.keyword.trim());
        if (activeFilters.country?.trim()) pushParams.set('country', activeFilters.country.trim());
        router.push(`/companies?${pushParams.toString()}`, { scroll: false });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load companies';
        if (replace) setError(message);
        setHasMoreState(false);
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters((prev) => {
        const nextKeyword = keywordInput.trim();
        if (prev.keyword === nextKeyword) return prev;
        return { ...prev, keyword: nextKeyword };
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [keywordInput]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      loadedPagesRef.current = new Set([1]);
      void loadCompanies(1, filters, true);
      return;
    }

    setCompanies([]);
    setPage(1);
    setHasMoreState(true);
    loadedPagesRef.current = new Set([1]);
    void loadCompanies(1, filters, true);
  }, [filters, loadCompanies]);

  const loadMore = useCallback(() => {
    if (loading || !hasMoreState) return;
    const nextPage = page + 1;
    if (loadedPagesRef.current.has(nextPage)) return;
    void loadCompanies(nextPage, filters, false);
  }, [filters, hasMoreState, loadCompanies, loading, page]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    const sentinel = observerRef.current;
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => observer.disconnect();
  }, [loadMore]);

  const countries = useMemo(
    () =>
      Array.from(
        new Map(
          availableCountryCodes
            .filter(Boolean)
            .map((code) => [code, { code, name: getCountryNameFromCode(code) }])
        ).values()
      ).sort((a, b) => a.name.localeCompare(b.name)),
    [availableCountryCodes]
  );

  const initialPageLoading = loading && companies.length === 0;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col mb-8 gap-4">
        <h1 className="text-4xl font-bold text-gray-900">
          We have {totalCount} {totalCount === 1 ? 'company' : 'companies'} meeting these criteria
        </h1>

        <div className="flex flex-col sm:flex-row items-end sm:items-center sm:justify-end gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Search companies..."
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white min-w-[200px]"
          />

          <select
            id="country-filter"
            value={filters.country || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, country: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white min-w-[200px]"
          >
            <option value="">All Countries</option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>

          {(filters.country || filters.keyword) && (
            <button
              type="button"
              onClick={() => {
                setKeywordInput('');
                setFilters({ keyword: '', country: '' });
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 underline whitespace-nowrap"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {(filters.country || filters.keyword) && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-4">
          Showing companies
          {filters.keyword && (
            <span>
              {' '}
              matching: <strong>{filters.keyword}</strong>
            </span>
          )}
          {filters.country && (
            <span>
              {filters.keyword ? ' in' : ''} <strong>{getCountryNameFromCode(filters.country)}</strong>
            </span>
          )}{' '}
          ({totalCount} {totalCount === 1 ? 'company' : 'companies'})
        </div>
      )}

      {initialPageLoading ? (
        <div className="text-center py-12 text-gray-600">Loading companies...</div>
      ) : companies.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600">No companies available at the moment.</p>
          <p className="text-gray-500 mt-2">Check back later for new companies!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {companies.map((company) => {
            const firstPicture =
              company.pictures && company.pictures.length > 0 ? company.pictures[0] : null;

            const locationParts: string[] = [];
            if (company.address?.city) {
              locationParts.push(company.address.city);
            }
            if (company.address?.country) {
              const countryName = getCountryNameFromCode(company.address.country);
              locationParts.push(countryName || company.address.country);
            }
            const locationText =
              locationParts.length > 0 ? locationParts.join(', ') : 'Location not specified';

            return (
              <Link
                key={company.id}
                href={getCompanyUrl(company)}
                className={`rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer block ${
                  company.featured
                    ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300'
                    : 'bg-white'
                }`}
              >
                <div className="w-full h-48 bg-gray-200 relative overflow-hidden">
                  {company.featured && (
                    <div className="absolute top-2 right-2 z-10 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-md text-xs font-bold shadow-md">
                      ⭐ Featured
                    </div>
                  )}
                  {firstPicture && isValidImageSrc(firstPicture) ? (
                    <Image
                      src={firstPicture}
                      alt={company.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      unoptimized={isBlobStorageUrl(firstPicture)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                      <span className="text-gray-500 text-sm">No Image</span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h2 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{company.name}</h2>

                  {company.description && (
                    <p className="text-sm text-gray-600 line-clamp-3 mb-2">
                      {getTagline(company.description)}
                    </p>
                  )}

                  <p className="text-sm text-gray-600 flex flex-wrap items-center gap-1">
                    <span className="mr-1">📍</span>
                    <span className="font-medium text-gray-800">{locationText}</span>
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div ref={observerRef} className="h-10" />

      {loading && companies.length > 0 && (
        <p className="text-center text-gray-600 py-4">Loading more companies...</p>
      )}
      {!hasMoreState && companies.length > 0 && (
        <p className="text-center text-gray-500 py-4">You have reached the end.</p>
      )}
    </main>
  );
}
