'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import JobCard from '../components/JobCard';
import JobSearchBar from './JobSearchBar';
import JobFiltersSidebar from './JobFiltersSidebar';
import MobileFiltersPanel from './MobileFiltersPanel';
import SaveJobAlertModal, { SaveJobAlertLoginPrompt } from './SaveJobAlertModal';
import JobAlertToast from './JobAlertToast';
import { hasSavableAlertFilters } from './savedSearchUtils';
import { useAuth } from '../contexts/AuthContext';
import type { JobListFilters, JobListItem } from '@/lib/jobs';
import { getCountryNameFromCode } from '@/lib/countryUtils';
import { JOB_CATEGORIES } from '@/lib/jobCategories';
import { EMPLOYMENT_TYPE_OPTIONS } from '@/lib/employmentTypes';

interface JobListProps {
  initialJobs: JobListItem[];
  initialCountries: string[];
  initialCities: string[];
  initialCategories: string[];
  initialEmploymentTypes: string[];
  initialActivities: string[];
  initialLanguages: string[];
  initialPage: number;
  hasMore: boolean;
  initialTotalCount: number;
  initialFilters: JobListFilters;
}

const PAGE_SIZE = 20;

function buildFilterQuery(page: number, filters: JobListFilters): string {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(PAGE_SIZE));
  if (filters.keyword?.trim()) params.set('keyword', filters.keyword.trim());
  if (filters.location?.trim()) params.set('location', filters.location.trim());
  if (filters.country?.trim()) params.set('country', filters.country.trim());
  if (filters.city?.trim()) params.set('city', filters.city.trim());
  if (filters.category?.trim()) params.set('category', filters.category.trim());
  if (filters.employmentType?.trim()) params.set('employmentType', filters.employmentType.trim());
  if (filters.activity?.trim()) params.set('activity', filters.activity.trim());
  if (filters.language?.trim()) params.set('language', filters.language.trim());
  return params.toString();
}

export default function JobList({
  initialJobs,
  initialCountries,
  initialCities,
  initialCategories,
  initialEmploymentTypes,
  initialActivities,
  initialLanguages,
  initialPage,
  hasMore,
  initialTotalCount,
  initialFilters,
}: JobListProps) {
  const [jobs, setJobs] = useState<JobListItem[]>(initialJobs);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [hasMoreState, setHasMoreState] = useState(hasMore);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [filters, setFilters] = useState<JobListFilters>(initialFilters);
  const [availableCountryCodes, setAvailableCountryCodes] = useState<string[]>(initialCountries);
  const [availableCities, setAvailableCities] = useState<string[]>(initialCities);
  const [availableCategories, setAvailableCategories] = useState<string[]>(initialCategories);
  const [availableEmploymentTypes, setAvailableEmploymentTypes] = useState<string[]>(initialEmploymentTypes);
  const [availableActivities, setAvailableActivities] = useState<string[]>(initialActivities);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>(initialLanguages);
  const [searchKeyword, setSearchKeyword] = useState(initialFilters.keyword || '');
  const [searchLocation, setSearchLocation] = useState(initialFilters.location || '');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [saveAlertModalOpen, setSaveAlertModalOpen] = useState(false);
  const [saveAlertLoginOpen, setSaveAlertLoginOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const observerRef = useRef<HTMLDivElement | null>(null);
  const loadedPagesRef = useRef<Set<number>>(new Set([initialPage]));
  const hasMountedRef = useRef(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const loadJobs = useCallback(async (pageToLoad: number, activeFilters: JobListFilters, replace = false) => {
    setLoading(true);

    try {
      const query = buildFilterQuery(pageToLoad, activeFilters);
      const res = await fetch(`/api/jobs?${query}`);
      if (!res.ok) {
        if (replace) {
          setJobs([]);
          setTotalCount(0);
        }
        setHasMoreState(false);
        return;
      }

      const data = await res.json();
      const nextJobs: JobListItem[] = Array.isArray(data.jobs) ? data.jobs : [];
      const nextHasMore = Boolean(data.hasMore);
      const nextTotalCount = typeof data.totalCount === 'number' ? data.totalCount : nextJobs.length;
      const nextAvailableCountries: string[] = Array.isArray(data.availableCountries)
        ? data.availableCountries
            .map((country: unknown) => String(country || '').trim().toUpperCase())
            .filter(Boolean)
        : [];
      const nextAvailableCities: string[] = Array.isArray(data.availableCities)
        ? data.availableCities.map((city: unknown) => String(city || '').trim()).filter(Boolean)
        : [];
      const nextAvailableCategories: string[] = Array.isArray(data.availableCategories)
        ? data.availableCategories.map((category: unknown) => String(category || '').trim()).filter(Boolean)
        : [];
      const nextAvailableEmploymentTypes: string[] = Array.isArray(data.availableEmploymentTypes)
        ? data.availableEmploymentTypes.map((type: unknown) => String(type || '').trim()).filter(Boolean)
        : [];
      const nextAvailableActivities: string[] = Array.isArray(data.availableActivities)
        ? data.availableActivities.map((activity: unknown) => String(activity || '').trim()).filter(Boolean)
        : [];
      const nextAvailableLanguages: string[] = Array.isArray(data.availableLanguages)
        ? data.availableLanguages.map((language: unknown) => String(language || '').trim()).filter(Boolean)
        : [];
      setAvailableCountryCodes(Array.from(new Set(nextAvailableCountries)));
      setAvailableCities(Array.from(new Set(nextAvailableCities)));
      setAvailableCategories(Array.from(new Set(nextAvailableCategories)));
      setAvailableEmploymentTypes(Array.from(new Set(nextAvailableEmploymentTypes)));
      setAvailableActivities(Array.from(new Set(nextAvailableActivities)));
      setAvailableLanguages(Array.from(new Set(nextAvailableLanguages)));

      if (nextJobs.length === 0) {
        if (replace) {
          setJobs([]);
          setTotalCount(nextTotalCount);
          loadedPagesRef.current = new Set([pageToLoad]);
          setPage(pageToLoad);
        }
        setHasMoreState(false);
        return;
      }

      if (replace) {
        setJobs(nextJobs);
        loadedPagesRef.current = new Set([pageToLoad]);
      } else {
        loadedPagesRef.current.add(pageToLoad);
        setJobs((prev) => {
          // Keep featured jobs on every page batch, but dedupe standard jobs by id.
          const seenStandard = new Set(prev.filter((job) => !job.featured).map((job) => job._id));
          const deduped = nextJobs.filter((job) => job.featured || !seenStandard.has(job._id));
          return [...prev, ...deduped];
        });
      }

      setTotalCount(nextTotalCount);
      setHasMoreState(nextHasMore);
      setPage(pageToLoad);

      const pushParams = new URLSearchParams();
      pushParams.set('page', String(pageToLoad));
      if (activeFilters.keyword?.trim()) pushParams.set('keyword', activeFilters.keyword.trim());
      if (activeFilters.location?.trim()) pushParams.set('location', activeFilters.location.trim());
      if (activeFilters.country?.trim()) pushParams.set('country', activeFilters.country.trim());
      if (activeFilters.city?.trim()) pushParams.set('city', activeFilters.city.trim());
      if (activeFilters.category?.trim()) pushParams.set('category', activeFilters.category.trim());
      if (activeFilters.employmentType?.trim()) pushParams.set('employmentType', activeFilters.employmentType.trim());
      if (activeFilters.activity?.trim()) pushParams.set('activity', activeFilters.activity.trim());
      if (activeFilters.language?.trim()) pushParams.set('language', activeFilters.language.trim());
      router.push(`/jobs?${pushParams.toString()}`, { scroll: false });
    } catch {
      setHasMoreState(false);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    setJobs([]);
    setPage(1);
    setHasMoreState(true);
    loadedPagesRef.current = new Set([1]);
    void loadJobs(1, filters, true);
  }, [filters, loadJobs]);

  const loadMore = useCallback(() => {
    if (loading || !hasMoreState) return;
    const nextPage = page + 1;
    if (loadedPagesRef.current.has(nextPage)) return;
    void loadJobs(nextPage, filters, false);
  }, [filters, hasMoreState, loadJobs, loading, page]);

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

  const renderedJobs = useMemo(() => jobs, [jobs]);
  const cities = useMemo(
    () => Array.from(new Set(availableCities)).sort((a, b) => a.localeCompare(b)),
    [availableCities]
  );
  const activities = useMemo(
    () => Array.from(new Set(availableActivities)).sort((a, b) => a.localeCompare(b)),
    [availableActivities]
  );
  const languages = useMemo(
    () => Array.from(new Set(availableLanguages)).sort((a, b) => a.localeCompare(b)),
    [availableLanguages]
  );
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
  const categories = useMemo(
    () =>
      Array.from(new Set(availableCategories))
        .map((value) => ({
          value,
          label: JOB_CATEGORIES.find((item) => item.value === value)?.label || value,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [availableCategories]
  );
  const employmentTypes = useMemo(
    () =>
      Array.from(new Set(availableEmploymentTypes))
        .map((value) => ({
          value,
          label: EMPLOYMENT_TYPE_OPTIONS.find((item) => item.value === value)?.label || value,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [availableEmploymentTypes]
  );

  const updateFilter = useCallback((key: keyof JobListFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({
      ...prev,
      keyword: searchKeyword.trim(),
      location: searchLocation.trim(),
    }));
  };

  const clearAllFilters = () => {
    setSearchKeyword('');
    setSearchLocation('');
    setFilters({
      keyword: '',
      location: '',
      country: '',
      city: '',
      category: '',
      employmentType: '',
      activity: '',
      language: '',
    });
  };

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: keyof JobListFilters; label: string; value: string }> = [];
    if (filters.keyword) chips.push({ key: 'keyword', label: 'Keyword', value: filters.keyword });
    if (filters.location) chips.push({ key: 'location', label: 'Location', value: filters.location });
    if (filters.country) chips.push({ key: 'country', label: 'Country', value: filters.country });
    if (filters.city) chips.push({ key: 'city', label: 'City', value: filters.city });
    if (filters.category) {
      const categoryLabel = JOB_CATEGORIES.find((item) => item.value === filters.category)?.label || filters.category;
      chips.push({ key: 'category', label: 'Category', value: categoryLabel });
    }
    if (filters.employmentType) {
      const typeLabel =
        EMPLOYMENT_TYPE_OPTIONS.find((item) => item.value === filters.employmentType)?.label || filters.employmentType;
      chips.push({ key: 'employmentType', label: 'Employment', value: typeLabel });
    }
    if (filters.activity) chips.push({ key: 'activity', label: 'Activity', value: filters.activity });
    if (filters.language) chips.push({ key: 'language', label: 'Language', value: filters.language });
    return chips;
  }, [filters]);

  const savableFiltersActive = useMemo(() => hasSavableAlertFilters(filters), [filters]);
  const canShowSaveAlertButton = !authLoading && savableFiltersActive;
  const activeCategoryLabel = filters.category
    ? categories.find((item) => item.value === filters.category)?.label
    : undefined;

  const handleSaveJobAlertClick = () => {
    if (!user || user.role !== 'job-seeker') {
      setSaveAlertLoginOpen(true);
      return;
    }
    setSaveAlertModalOpen(true);
  };

  return (
    <>
      <JobAlertToast message={toastMessage} />
      <div className="bg-white border-b shadow-sm py-2">
        <JobSearchBar
          keyword={searchKeyword}
          location={searchLocation}
          onKeywordChange={setSearchKeyword}
          onLocationChange={setSearchLocation}
          onSubmit={handleSearchSubmit}
        />
      </div>

      <div className="lg:hidden sticky top-16 z-40 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm py-2 px-1">
        <div className="flex items-center justify-between gap-3 px-1">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 text-sm"
          >
            Set Search Filters
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
                key={`mobile-${chip.key}-${chip.value}`}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm"
              >
                {chip.label}: {chip.value}
                <button
                  type="button"
                  onClick={() => updateFilter(chip.key, '')}
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
        <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-28 self-start">
          <JobFiltersSidebar
            filters={filters}
            onChange={updateFilter}
            countries={countries}
            cities={cities}
            categories={categories}
            employmentTypes={employmentTypes}
            activities={activities}
            languages={languages}
          />
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <p className="text-xl sm:text-2xl font-bold text-gray-900">
              We have {totalCount} {totalCount === 1 ? 'job' : 'jobs'} meeting these criteria
            </p>
            {canShowSaveAlertButton && (
              <button
                type="button"
                onClick={handleSaveJobAlertClick}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 whitespace-nowrap self-start sm:self-auto"
              >
                🔔 Save Job Alert
              </button>
            )}
          </div>

          {activeFilterChips.length > 0 && (
            <div className="hidden lg:flex mb-4 flex-wrap gap-2 items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {activeFilterChips.map((chip) => (
                  <span
                    key={`${chip.key}-${chip.value}`}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm"
                  >
                    {chip.label}: {chip.value}
                    <button
                      type="button"
                      onClick={() => updateFilter(chip.key, '')}
                      className="text-blue-700 hover:text-blue-900"
                      aria-label={`Remove ${chip.label} filter`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-sm px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-white"
              >
                Clear filters
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {renderedJobs.map((job, index) => (
              <JobCard key={`${job._id}-${index}`} job={job} priority={index < 3} />
            ))}
          </div>
        </div>
      </div>

      <div ref={observerRef} className="h-10" />

      {loading && <p className="text-center text-gray-600 py-4">Loading more jobs...</p>}
      {!hasMoreState && jobs.length > 0 && (
        <p className="text-center text-gray-500 py-4">You have reached the end.</p>
      )}

      <MobileFiltersPanel
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        filters={filters}
        onChange={updateFilter}
        countries={countries}
        cities={cities}
        categories={categories}
        employmentTypes={employmentTypes}
        activities={activities}
        languages={languages}
      />

      <SaveJobAlertModal
        open={saveAlertModalOpen}
        filters={filters}
        alertNameLabels={{ category: activeCategoryLabel }}
        onClose={() => setSaveAlertModalOpen(false)}
        onSuccess={() => setToastMessage('Job alert created successfully.')}
      />
      <SaveJobAlertLoginPrompt
        open={saveAlertLoginOpen}
        onClose={() => setSaveAlertLoginOpen(false)}
      />
    </>
  );
}
