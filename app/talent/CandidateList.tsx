'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { candidatesApi } from '@/lib/api';
import { getCountryNameFromCode } from '@/lib/countryUtils';
import {
  buildCandidateFilterChips,
  buildCandidateSearchQuery,
  candidateListFiltersToSearchParams,
  EMPTY_CANDIDATE_LIST_FILTERS,
  searchParamsToCandidateListFilters,
  type CandidateListFilters,
  type CandidateSearchParams,
} from '@/lib/candidateSearchParams';
import type { CandidateFilterOptions, CandidateListItem } from '@/lib/candidateListTypes';
import TalentListRow from '@/app/components/TalentListRow';
import CandidateSearchBar from './CandidateSearchBar';
import CandidateFiltersSidebar from './CandidateFiltersSidebar';
import MobileFiltersPanel from './MobileFiltersPanel';

type CandidateListProps = {
  initialFilters: CandidateSearchParams;
};

const EMPTY_FILTER_OPTIONS: CandidateFilterOptions = {
  languages: [],
  workAreas: [],
  sports: [],
  certifications: [],
  experienceLevels: [],
  availability: [],
  preferredCountries: [],
  eligibleCountries: [],
};

export default function CandidateList({ initialFilters }: CandidateListProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<CandidateListFilters>(() =>
    searchParamsToCandidateListFilters(initialFilters)
  );
  const [searchKeyword, setSearchKeyword] = useState(initialFilters.kw || '');
  const [cvs, setCvs] = useState<CandidateListItem[]>([]);
  const [filterOptions, setFilterOptions] = useState<CandidateFilterOptions>(EMPTY_FILTER_OPTIONS);
  const [page, setPage] = useState(initialFilters.page || 1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [favouriteCvIds, setFavouriteCvIds] = useState<Set<string>>(new Set());
  const [togglingFavouriteId, setTogglingFavouriteId] = useState<string | null>(null);
  const observerRef = useRef<HTMLDivElement | null>(null);
  const loadedPagesRef = useRef<Set<number>>(new Set([initialFilters.page || 1]));
  const hasMountedRef = useRef(false);
  const filtersKeyRef = useRef('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'recruiter' && user.role !== 'admin') {
      router.push(`/${user.role === 'job-seeker' ? 'job-seeker' : user.role || 'recruiter'}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && (user.role === 'recruiter' || user.role === 'admin')) {
      candidatesApi
        .getFavourites()
        .then((data: { cvs?: { _id: string }[] }) => {
          const ids = new Set((data.cvs || []).map((c) => String(c._id)));
          setFavouriteCvIds(ids);
        })
        .catch(() => {});
    }
  }, [user]);

  const loadCandidates = useCallback(
    async (pageToLoad: number, activeFilters: CandidateListFilters, replace = false) => {
      if (!user || (user.role !== 'recruiter' && user.role !== 'admin')) return;
      setLoading(true);
      setError('');

      try {
        const query = buildCandidateSearchQuery(
          candidateListFiltersToSearchParams(activeFilters, pageToLoad)
        );
        const response = await fetch(`/api/candidates-list${query ? `?${query}` : ''}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to load profiles');
        }

        const data = await response.json();
        const nextCvs: CandidateListItem[] = Array.isArray(data.cvs) ? data.cvs : [];
        const pagination = data.pagination || { page: 1, total: 0, totalPages: 1 };

        setFilterOptions({
          languages: data.filters?.languages || [],
          workAreas: data.filters?.workAreas || [],
          sports: data.filters?.sports || [],
          certifications: data.filters?.certifications || [],
          experienceLevels: data.filters?.experienceLevels || [],
          availability: data.filters?.availability || [],
          preferredCountries: data.filters?.preferredCountries || [],
          eligibleCountries: data.filters?.eligibleCountries || [],
        });

        if (replace) {
          setCvs(nextCvs);
          loadedPagesRef.current = new Set([pageToLoad]);
        } else {
          loadedPagesRef.current.add(pageToLoad);
          setCvs((prev) => {
            const seen = new Set(prev.map((cv) => cv._id));
            const deduped = nextCvs.filter((cv) => !seen.has(cv._id));
            return [...prev, ...deduped];
          });
        }

        setTotalCount(typeof pagination.total === 'number' ? pagination.total : nextCvs.length);
        setHasMore(pageToLoad < (pagination.totalPages || 1));
        setPage(pageToLoad);

        const urlQuery = buildCandidateSearchQuery(
          candidateListFiltersToSearchParams(activeFilters, pageToLoad)
        );
        const currentQuery = searchParams.toString();
        if (urlQuery !== currentQuery) {
          router.push(urlQuery ? `/candidates?${urlQuery}` : '/candidates', { scroll: false });
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load profiles');
        if (replace) {
          setCvs([]);
          setTotalCount(0);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
      }
    },
    [router, searchParams, user]
  );

  useEffect(() => {
    if (!user || (user.role !== 'recruiter' && user.role !== 'admin')) return;

    const filtersKey = buildCandidateSearchQuery(candidateListFiltersToSearchParams(filters));

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      filtersKeyRef.current = filtersKey;
      void loadCandidates(
        initialFilters.page || 1,
        searchParamsToCandidateListFilters(initialFilters),
        true
      );
      return;
    }

    if (filtersKeyRef.current === filtersKey) return;
    filtersKeyRef.current = filtersKey;

    setCvs([]);
    loadedPagesRef.current = new Set([1]);
    void loadCandidates(1, filters, true);
  }, [filters, user, loadCandidates]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    if (loadedPagesRef.current.has(nextPage)) return;
    void loadCandidates(nextPage, filters, false);
  }, [filters, hasMore, loadCandidates, loading, page]);

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
    if (sentinel) observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const updateFilter = useCallback((key: keyof CandidateListFilters, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, kw: searchKeyword.trim() }));
  };

  const handleQuickFilterChange = (key: keyof CandidateListFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setSearchKeyword('');
    setFilters({ ...EMPTY_CANDIDATE_LIST_FILTERS });
  };

  const clearFilter = (key: keyof CandidateListFilters) => {
    if (key === 'verifiedOnly') {
      updateFilter('verifiedOnly', false);
      return;
    }
    if (key === 'sort') {
      updateFilter('sort', 'newest');
      return;
    }
    if (key === 'kw') {
      setSearchKeyword('');
    }
    updateFilter(key, '');
  };

  const handleToggleFavourite = async (e: React.MouseEvent, cvId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (togglingFavouriteId) return;
    setTogglingFavouriteId(cvId);
    try {
      await candidatesApi.toggleFavourite(cvId);
      setFavouriteCvIds((prev) => {
        const next = new Set(prev);
        if (next.has(cvId)) next.delete(cvId);
        else next.add(cvId);
        return next;
      });
    } catch {
      // keep UI unchanged on error
    } finally {
      setTogglingFavouriteId(null);
    }
  };

  const eligibleCountries = useMemo(
    () =>
      Array.from(
        new Map(
          filterOptions.eligibleCountries
            .filter(Boolean)
            .map((code) => [code, { code, name: getCountryNameFromCode(code) }])
        ).values()
      ).sort((a, b) => a.name.localeCompare(b.name)),
    [filterOptions.eligibleCountries]
  );

  const preferredCountries = useMemo(
    () =>
      Array.from(
        new Map(
          filterOptions.preferredCountries
            .filter(Boolean)
            .map((code) => [code, { code, name: getCountryNameFromCode(code) }])
        ).values()
      ).sort((a, b) => a.name.localeCompare(b.name)),
    [filterOptions.preferredCountries]
  );

  const activeFilterChips = useMemo(
    () => buildCandidateFilterChips(filters, getCountryNameFromCode),
    [filters]
  );

  const showFavourite = user?.role === 'recruiter' || user?.role === 'admin';

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Find Talent</h1>
        <p className="mt-2 text-gray-600">Browse verified watersports professionals</p>
      </div>

      <CandidateSearchBar
        searchKeyword={searchKeyword}
        filters={filters}
        sports={filterOptions.sports}
        certifications={filterOptions.certifications}
        availabilityOptions={filterOptions.availability}
        onSearchKeywordChange={setSearchKeyword}
        onQuickFilterChange={handleQuickFilterChange}
        onSearchSubmit={handleSearchSubmit}
        onOpenMoreFilters={() => setMobileFiltersOpen(true)}
      />

      <div className="lg:hidden sticky top-16 z-40 mt-3 bg-white/95 backdrop-blur border border-gray-200 rounded-lg shadow-sm py-2 px-1">
        <div className="flex items-center justify-between gap-3 px-1">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 text-sm"
          >
            More filters
          </button>
          {activeFilterChips.length > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-sm px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-white"
            >
              Clear filters
            </button>
          )}
        </div>
        {activeFilterChips.length > 0 && (
          <div className="mt-2 flex gap-2 overflow-x-auto whitespace-nowrap px-1 pb-1">
            {activeFilterChips.map((chip) => (
              <span
                key={`${chip.key}-${chip.value}`}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm"
              >
                {chip.label}: {chip.value}
                <button
                  type="button"
                  onClick={() => clearFilter(chip.key)}
                  className="text-blue-700 hover:text-blue-900"
                  aria-label={`Remove ${chip.label} filter`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mt-4">
        <aside className="hidden lg:block w-72 flex-shrink-0 sticky top-28 self-start">
          <CandidateFiltersSidebar
            filters={filters}
            onChange={updateFilter}
            workAreas={filterOptions.workAreas}
            languages={filterOptions.languages}
            experienceLevels={filterOptions.experienceLevels}
            availabilityOptions={filterOptions.availability}
            eligibleCountries={eligibleCountries}
            preferredCountries={preferredCountries}
          />
        </aside>

        <div className="flex-1 min-w-0">
          {activeFilterChips.length > 0 && (
            <div className="hidden lg:flex flex-wrap gap-2 mb-4">
              {activeFilterChips.map((chip) => (
                <span
                  key={`desktop-${chip.key}-${chip.value}`}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm"
                >
                  {chip.label}: {chip.value}
                  <button
                    type="button"
                    onClick={() => clearFilter(chip.key)}
                    className="text-blue-700 hover:text-blue-900"
                    aria-label={`Remove ${chip.label} filter`}
                  >
                    ✕
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-sm px-3 py-1 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Clear all
              </button>
            </div>
          )}

          <p className="text-gray-700 mb-4">
            {loading && cvs.length === 0
              ? 'Searching talent…'
              : `${totalCount} professional${totalCount === 1 ? '' : 's'} match your search`}
          </p>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {!loading && cvs.length === 0 && !error && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-700 font-medium mb-2">No professionals match these filters</p>
              <p className="text-gray-500 text-sm mb-4">
                Try broadening your sport, certification, or availability filters—or search by a different name.
              </p>
              {activeFilterChips.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          <div className="space-y-3">
            {cvs.map((candidate) => (
              <TalentListRow
                key={candidate._id}
                candidate={candidate}
                showFavourite={showFavourite}
                isFavourite={favouriteCvIds.has(candidate._id)}
                togglingFavourite={togglingFavouriteId === candidate._id}
                onToggleFavourite={handleToggleFavourite}
              />
            ))}
          </div>

          {loading && cvs.length > 0 && (
            <p className="text-center text-gray-500 py-4">Loading more…</p>
          )}

          <div ref={observerRef} className="h-8" aria-hidden="true" />
        </div>
      </div>

      <MobileFiltersPanel
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        filters={filters}
        onChange={updateFilter}
        workAreas={filterOptions.workAreas}
        languages={filterOptions.languages}
        experienceLevels={filterOptions.experienceLevels}
        availabilityOptions={filterOptions.availability}
        eligibleCountries={eligibleCountries}
        preferredCountries={preferredCountries}
      />
    </>
  );
}
