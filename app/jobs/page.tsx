'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Navbar from '../components/Navbar';
import { jobsApi, savedSearchesApi } from '@/lib/api';
import { getCountryNameFromCode } from '@/lib/countryUtils';
import { parseJobSearchParams, buildJobSearchQuery, buildJobSearchUrl, type JobSearchParams } from '@/lib/jobSearchParams';
import { JOB_CATEGORIES } from '@/src/constants/jobCategories';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';

interface Job {
  _id: string;
  title: string;
  description: string;
  company: string;
  city: string;
  country?: string;
  salary?: string;
  type: string;
  languages?: string[];
  occupationalAreas?: string[];
  sports?: string[];
  pictures?: string[];
  featured?: boolean;
  recruiter: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt?: string;
}

// Helper function to format time ago
function getTimeAgo(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
}

// Component to handle time ago display (prevents hydration mismatch)
function TimeAgoDisplay({ date }: { date: string }) {
  const [timeAgo, setTimeAgo] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTimeAgo(getTimeAgo(date));

    // Update every minute
    const interval = setInterval(() => {
      setTimeAgo(getTimeAgo(date));
    }, 60000);

    return () => clearInterval(interval);
  }, [date]);

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return <span className="text-xs text-gray-500">Loading...</span>;
  }

  return <span className="text-xs text-gray-500">{timeAgo}</span>;
}

function JobsPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]); // Store all jobs for filtering
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Initialize state from URL params immediately if available
  // This prevents loading all jobs before filters are applied
  const urlParams = searchParams ? parseJobSearchParams(searchParams) : null;
  const activityValue = searchParams && urlParams 
    ? (urlParams.activity || searchParams.get('sport') || '') 
    : '';

  const [selectedCountry, setSelectedCountry] = useState<string>(urlParams?.country || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(urlParams?.category || '');
  const [selectedActivity, setSelectedActivity] = useState<string>(activityValue);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(urlParams?.language || '');
  const [selectedCity, setSelectedCity] = useState<string>(urlParams?.city || '');
  const [keyword, setKeyword] = useState<string>(urlParams?.keyword || '');
  const [location, setLocation] = useState<string>(urlParams?.location || '');
  
  // Separate state for search bar inputs (don't trigger job loading until submit)
  const [searchKeyword, setSearchKeyword] = useState<string>(urlParams?.keyword || '');
  const [searchLocation, setSearchLocation] = useState<string>(urlParams?.location || '');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showSaveSearchModal, setShowSaveSearchModal] = useState(false);
  const [savingSearch, setSavingSearch] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [saveSearchFrequency, setSaveSearchFrequency] = useState<'daily' | 'weekly' | 'never'>('weekly');
  const [saveSearchMessage, setSaveSearchMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const jobsPerPage = 20;
  const isInitialMount = useRef(true);

  // Sync state with URL query parameters when URL changes (browser back/forward)
  // Skip on initial mount since state is already initialized from URL params
  // This ensures page reload preserves search state and browser back/forward works correctly
  useEffect(() => {
    if (!searchParams) return;
    
    // Skip on initial mount - state is already initialized from URL params above
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Parse all supported search parameters from URL using canonical parser
    const urlParams = parseJobSearchParams(searchParams);
    
    // Also check for legacy 'sport' parameter for backward compatibility
    const activityValue = urlParams.activity || searchParams.get('sport') || '';

    // Update state from URL parameters
    // This handles both setting values and clearing them when removed from URL
    // This ensures state always matches URL, supporting browser back/forward navigation
    setKeyword(urlParams.keyword || '');
    setLocation(urlParams.location || '');
    setSelectedCountry(urlParams.country || '');
    setSelectedCategory(urlParams.category || '');
    setSelectedActivity(activityValue);
    setSelectedLanguage(urlParams.language || '');
    setSelectedCity(urlParams.city || '');
    
    // Also update search bar inputs to stay in sync with URL
    setSearchKeyword(urlParams.keyword || '');
    setSearchLocation(urlParams.location || '');
  }, [searchParams]);

  // Update canonical URL for SEO
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const currentParams = searchParams ? parseJobSearchParams(searchParams) : {};
    const canonicalUrl = buildJobSearchUrl('/jobs', currentParams);
    const fullCanonicalUrl = `${window.location.origin}${canonicalUrl}`;
    
    // Update or create canonical link tag
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', fullCanonicalUrl);
  }, [searchParams]);

  // Reload jobs when filters change (API now handles filtering server-side)
  useEffect(() => {
    // Reload jobs with current filters
    loadJobs();
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, [selectedCountry, selectedCategory, selectedActivity, selectedLanguage, selectedCity, keyword, location]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      
      // Load all jobs for filter options (countries, categories, sports, languages)
      // This is done once and cached in allJobs state
      const allJobsData = await jobsApi.getAll('/jobs');
      const allJobsList = allJobsData.jobs || [];
      
      // Sort all jobs for filter options
      const sortedAllJobs = [...allJobsList].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setAllJobs(sortedAllJobs);
      
      // Build query string from current filters for filtered results
      const params = new URLSearchParams();
      if (keyword) params.set('keyword', keyword);
      if (location) params.set('location', location);
      if (selectedCountry) params.set('country', selectedCountry);
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedActivity) params.set('activity', selectedActivity);
      if (selectedLanguage) params.set('language', selectedLanguage);
      if (selectedCity) params.set('city', selectedCity);
      
      const queryString = params.toString();
      const endpoint = queryString ? `/jobs?${queryString}` : '/jobs';
      
      // API now handles filtering server-side
      const filteredData = await jobsApi.getAll(endpoint);
      const filteredJobsList = filteredData.jobs || [];

      // Sort filtered jobs: featured first, then by posting date descending
      const sortedFilteredJobs = [...filteredJobsList].sort((a, b) => {
        // Featured jobs come first
        const aFeatured = Boolean(a.featured);
        const bFeatured = Boolean(b.featured);

        // If one is featured and the other isn't, featured comes first
        if (aFeatured && !bFeatured) return -1;
        if (!aFeatured && bFeatured) return 1;

        // Within each group (both featured or both non-featured), sort by posting date (createdAt) descending
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Descending (newest first)
      });

      setJobs(sortedFilteredJobs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load jobs';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Get unique countries from filtered jobs (only show available options)
  const getUniqueCountries = (): Array<{ code: string; name: string }> => {
    const countryMap = new Map<string, string>();

    jobs.forEach((job) => {
      if (job.country && job.country.trim()) {
        const code = job.country.toUpperCase();
        if (!countryMap.has(code)) {
          countryMap.set(code, getCountryNameFromCode(code));
        }
      }
    });

    // Convert to array and sort by country name
    const countries = Array.from(countryMap.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return countries;
  };

  // Get job categories from canonical source (JOB_CATEGORIES)
  // Filter to only show categories that exist in the current job results
  const getAvailableCategories = (): string[] => {
    const availableCategories = new Set<string>();

    jobs.forEach((job) => {
      if (job.occupationalAreas && job.occupationalAreas.length > 0) {
        job.occupationalAreas.forEach((category) => {
          // Only include categories that are in JOB_CATEGORIES (skip old/invalid values)
          if (JOB_CATEGORIES.includes(category as any)) {
            availableCategories.add(category);
          }
        });
      }
    });

    // Convert to array, filter to JOB_CATEGORIES, and sort alphabetically
    return JOB_CATEGORIES.filter(cat => availableCategories.has(cat));
  };

  // Get unique sports/activities from filtered jobs (only show available options)
  const getUniqueSports = (): string[] => {
    const sportSet = new Set<string>();

    jobs.forEach((job) => {
      if (job.sports && job.sports.length > 0) {
        job.sports.forEach((sport) => {
          sportSet.add(sport);
        });
      }
    });

    // Convert to array and sort alphabetically
    return Array.from(sportSet).sort();
  };

  // Get unique languages from filtered jobs (only show available options)
  const getUniqueLanguages = (): string[] => {
    const languageSet = new Set<string>();

    jobs.forEach((job) => {
      if (job.languages && job.languages.length > 0) {
        job.languages.forEach((language) => {
          languageSet.add(language);
        });
      }
    });

    // Convert to array and sort alphabetically
    return Array.from(languageSet).sort();
  };

  // Get unique cities from filtered jobs (only show available options)
  const getUniqueCities = (): string[] => {
    const citySet = new Set<string>();

    jobs.forEach((job) => {
      // Extract city from location field (assuming location contains city name)
      // If location.city exists in the data, use that; otherwise use location field
      if (job.city && job.city.trim()) {
        const city = job.city.trim();
        if (city) {
          citySet.add(city);
        }
      }
    });

    // Convert to array and sort alphabetically
    return Array.from(citySet).sort();
  };

  // Handler to update filter and URL
  const handleFilterChange = (filterType: 'country' | 'category' | 'activity' | 'language' | 'city', value: string) => {
    // Update local state
    if (filterType === 'country') setSelectedCountry(value);
    if (filterType === 'category') setSelectedCategory(value);
    if (filterType === 'activity') setSelectedActivity(value);
    if (filterType === 'language') setSelectedLanguage(value);
    if (filterType === 'city') setSelectedCity(value);

    // Build clean URL params using canonical utility
    const currentParams = searchParams ? parseJobSearchParams(searchParams) : {};
    const newParams: JobSearchParams = { ...currentParams };
    
    if (filterType === 'country') {
      if (value) newParams.country = value;
      else delete newParams.country;
    }
    if (filterType === 'category') {
      if (value) newParams.category = value;
      else delete newParams.category;
    }
    if (filterType === 'activity') {
      if (value) newParams.activity = value;
      else delete newParams.activity;
    }
    if (filterType === 'language') {
      if (value) newParams.language = value;
      else delete newParams.language;
    }
    if (filterType === 'city') {
      if (value) newParams.city = value;
      else delete newParams.city;
    }

    const newUrl = buildJobSearchUrl('/jobs', newParams);
    router.push(newUrl);
  };

  // Handler to remove keyword or location filter
  const handleRemoveSearchFilter = (filterType: 'keyword' | 'location') => {
    // Update local state
    if (filterType === 'keyword') {
      setKeyword('');
      setSearchKeyword('');
    }
    if (filterType === 'location') {
      setLocation('');
      setSearchLocation('');
    }

    // Build clean URL params using canonical utility
    const currentParams = searchParams ? parseJobSearchParams(searchParams) : {};
    const newParams: JobSearchParams = { ...currentParams };
    
    if (filterType === 'keyword') {
      delete newParams.keyword;
    }
    if (filterType === 'location') {
      delete newParams.location;
    }

    const newUrl = buildJobSearchUrl('/jobs', newParams);
    router.push(newUrl);
  };

  // Handler to clear all filters and search
  const handleClearAllFilters = () => {
    // Reset all state variables
    setKeyword('');
    setLocation('');
    setSearchKeyword('');
    setSearchLocation('');
    setSelectedCountry('');
    setSelectedCategory('');
    setSelectedActivity('');
    setSelectedLanguage('');
    setSelectedCity('');
    setCurrentPage(1);

    // Navigate to /jobs with no query parameters
    router.push('/jobs');
  };

  const handleSaveSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveSearchName.trim()) {
      setSaveSearchMessage('Please enter a name for your saved search');
      return;
    }

    setSavingSearch(true);
    setSaveSearchMessage('');

    try {
      await savedSearchesApi.create({
        name: saveSearchName.trim(),
        keyword: keyword || undefined,
        location: location || undefined,
        country: selectedCountry || undefined,
        category: selectedCategory || undefined,
        activity: selectedActivity || undefined,
        language: selectedLanguage || undefined,
        city: selectedCity || undefined,
        frequency: saveSearchFrequency,
        active: true,
      });

      setSaveSearchMessage('Search saved successfully!');
      setTimeout(() => {
        setShowSaveSearchModal(false);
        setSaveSearchName('');
        setSaveSearchMessage('');
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save search';
      setSaveSearchMessage(errorMessage);
    } finally {
      setSavingSearch(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build clean URL params using canonical utility (preserve existing params like country, category, etc.)
    const currentParams = searchParams ? parseJobSearchParams(searchParams) : {};
    const newParams: JobSearchParams = { ...currentParams };
    
    // Update keyword and location params from search bar inputs
    if (searchKeyword.trim()) {
      newParams.keyword = searchKeyword.trim();
    } else {
      delete newParams.keyword;
    }
    
    if (searchLocation.trim()) {
      newParams.location = searchLocation.trim();
    } else {
      delete newParams.location;
    }
    
    // Update URL - this will trigger the useEffect that syncs state and loads jobs
    const newUrl = buildJobSearchUrl('/jobs', newParams);
    router.push(newUrl);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Compact Search Bar - Always Visible */}
        <div className="mb-4 sm:mb-6">
          <form onSubmit={handleSearchSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  id="search-keyword"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Keyword"
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  id="search-location"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="City or country"
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
                >
                  Search
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Main Content Layout: Sidebar + Jobs Grid */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Mobile Overlay */}
          {sidebarOpen && (
            <div
              className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Filters Sidebar */}
          <aside className={`lg:w-64 flex-shrink-0 ${sidebarOpen ? 'fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto bg-white' : 'hidden'} lg:block lg:relative lg:z-auto`}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 lg:sticky lg:top-4 h-full lg:h-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden text-gray-500 hover:text-gray-700"
                  aria-label="Close filters"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
            {/* Country Filter */}
                <div>
                  <label htmlFor="country-filter" className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <div className="flex items-center gap-2">
            <select
              id="country-filter"
              value={selectedCountry}
                      onChange={(e) => handleFilterChange('country', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white text-sm"
            >
              <option value="">All Countries</option>
              {getUniqueCountries().map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
                    {selectedCountry && (
                      <button
                        onClick={() => handleFilterChange('country', '')}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="Clear country filter"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* City Filter */}
                <div>
                  <label htmlFor="city-filter" className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      id="city-filter"
                      value={selectedCity}
                      onChange={(e) => handleFilterChange('city', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white text-sm"
                    >
                      <option value="">All Cities</option>
                      {getUniqueCities().map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                    {selectedCity && (
                      <button
                        onClick={() => handleFilterChange('city', '')}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="Clear city filter"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-2">
                    Job Type
                  </label>
                  <div className="flex items-center gap-2">
            <select
              id="category-filter"
              value={selectedCategory}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white text-sm"
            >
              <option value="">All Categories</option>
                      {getAvailableCategories().map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
                    {selectedCategory && (
                      <button
                        onClick={() => handleFilterChange('category', '')}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="Clear category filter"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Activity Filter */}
                <div>
                  <label htmlFor="activity-filter" className="block text-sm font-medium text-gray-700 mb-2">
                    Activity Type
                  </label>
                  <div className="flex items-center gap-2">
            <select
                      id="activity-filter"
                      value={selectedActivity}
                      onChange={(e) => handleFilterChange('activity', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white text-sm"
                    >
                      <option value="">All Activities</option>
              {getUniqueSports().map((sport) => (
                <option key={sport} value={sport}>
                  {sport}
                </option>
              ))}
            </select>
                    {selectedActivity && (
                      <button
                        onClick={() => handleFilterChange('activity', '')}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="Clear activity filter"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Language Filter */}
                <div>
                  <label htmlFor="language-filter" className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <div className="flex items-center gap-2">
            <select
              id="language-filter"
              value={selectedLanguage}
                      onChange={(e) => handleFilterChange('language', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white text-sm"
            >
              <option value="">All Languages</option>
              {getUniqueLanguages().map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
                    {selectedLanguage && (
                      <button
                        onClick={() => handleFilterChange('language', '')}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="Clear language filter"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col mb-6 sm:mb-8 gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Mobile Filter Toggle Button */}
              <button
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    aria-label="Open filters"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span className="hidden xs:inline">Filters</span>
                  </button>
                  <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-gray-900">
                    We have {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} meeting these criteria
                  </h1>
                </div>
                {/* Save Search Button - Only for job seekers */}
                {user && user.role === 'job-seeker' && (keyword || location || selectedCountry || selectedCategory || selectedActivity || selectedLanguage || selectedCity) && (
                  <button
                    onClick={() => setShowSaveSearchModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2 whitespace-nowrap"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    Save Search
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

            {/* Active Filter Chips */}
            {(keyword || location || selectedCountry || selectedCategory || selectedActivity || selectedLanguage || selectedCity) && (
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2 items-center">
                  {keyword && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      <span>Keyword: <strong>{keyword}</strong></span>
                      <button
                        onClick={() => handleRemoveSearchFilter('keyword')}
                        className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                        aria-label="Remove keyword filter"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  {location && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      <span>Location: <strong>{location}</strong></span>
                      <button
                        onClick={() => handleRemoveSearchFilter('location')}
                        className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                        aria-label="Remove location filter"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
            {selectedCountry && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      <span>Country: <strong>{getCountryNameFromCode(selectedCountry)}</strong></span>
                      <button
                        onClick={() => handleFilterChange('country', '')}
                        className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                        aria-label="Remove country filter"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
            )}
            {selectedCategory && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      <span>Job Type: <strong>{selectedCategory}</strong></span>
                      <button
                        onClick={() => handleFilterChange('category', '')}
                        className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                        aria-label="Remove category filter"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  {selectedActivity && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      <span>Activity: <strong>{selectedActivity}</strong></span>
                      <button
                        onClick={() => handleFilterChange('activity', '')}
                        className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                        aria-label="Remove activity filter"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
            )}
            {selectedLanguage && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      <span>Language: <strong>{selectedLanguage}</strong></span>
                      <button
                        onClick={() => handleFilterChange('language', '')}
                        className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                        aria-label="Remove language filter"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  {selectedCity && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      <span>City: <strong>{selectedCity}</strong></span>
                      <button
                        onClick={() => handleFilterChange('city', '')}
                        className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                        aria-label="Remove city filter"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  </div>
                  {/* Clear All Button */}
                  <button
                    onClick={handleClearAllFilters}
                    className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors whitespace-nowrap self-start sm:self-auto"
                  >
                    Clear search
                  </button>
                </div>
          </div>
        )}

        {jobs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">No jobs available at the moment.</p>
            <p className="text-gray-500 mt-2">Check back later for new opportunities!</p>
          </div>
        ) : (
          <>
            {/* Calculate pagination */}
            {(() => {
              const totalPages = Math.ceil(jobs.length / jobsPerPage);
              const indexOfLastJob = currentPage * jobsPerPage;
              const indexOfFirstJob = indexOfLastJob - jobsPerPage;
              const currentJobs = jobs.slice(indexOfFirstJob, indexOfLastJob);

              return (
                <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {currentJobs.map((job) => {
                      // Get the most recent date (createdAt or updatedAt if it exists and is more recent)
                      const mostRecentDate = (job.updatedAt && new Date(job.updatedAt) > new Date(job.createdAt))
                        ? job.updatedAt
                        : job.createdAt;

                      // Get the first picture, or use a placeholder
                      const firstPicture = job.pictures && job.pictures.length > 0
                        ? job.pictures[0]
                        : null;

                      return (
                        <Link
                          key={job._id}
                          href={`/jobs/${job._id}`}
                          className={`rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer block ${job.featured
                            ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300'
                            : 'bg-white'
                            }`}
                        >
                          {/* Job Picture */}
                          <div className="w-full h-48 bg-gray-200 relative overflow-hidden">
                            {job.featured && (
                              <div className="absolute top-2 right-2 z-10 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-md text-xs font-bold shadow-md">
                                ⭐ Featured
                              </div>
                            )}
                            {firstPicture ? (
                              <Image
                                src={firstPicture}
                                alt={job.title}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                                <span className="text-gray-500 text-sm">No Image</span>
                              </div>
                            )}
                          </div>

                          {/* Job Title */}
                          <div className="p-4">
                            <h2 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                              {job.title}
                            </h2>

                            {/* Location and Time Ago */}
                            <div className="flex flex-col gap-1">
                              <p className="text-sm text-gray-600 flex flex-wrap items-center gap-1">
                                <span className="mr-1">📍</span>
                                <span>{job.city}</span>
                                {job.country && typeof job.country === 'string' && job.country.trim() && (
                                  <span>
                                    , {getCountryNameFromCode(job.country)}
                                  </span>
                                )}
                              </p>
                              <TimeAgoDisplay date={mostRecentDate} />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-2">
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className={`px-4 py-2 rounded-md font-medium ${currentPage === 1
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                      >
                        Previous
                      </button>

                      <div className="flex gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          // Show first page, last page, current page, and pages around current
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-2 rounded-md font-medium ${currentPage === page
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                                  }`}
                              >
                                {page}
                              </button>
                            );
                          } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return (
                              <span key={page} className="px-2 py-2 text-gray-500">
                                ...
                              </span>
                            );
                          }
                          return null;
                        })}
                      </div>

                      <button
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className={`px-4 py-2 rounded-md font-medium ${currentPage === totalPages
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                      >
                        Next
                      </button>
                    </div>
                  )}

                  {/* Page info */}
                  {totalPages > 1 && (
                    <div className="mt-4 text-center text-sm text-gray-600">
                      Showing {indexOfFirstJob + 1} to {Math.min(indexOfLastJob, jobs.length)} of {jobs.length} jobs
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}

            {/* Save Search Modal */}
            {showSaveSearchModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => !savingSearch && setShowSaveSearchModal(false)}
          >
            <div 
              className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Save Job Search</h2>
              <form onSubmit={handleSaveSearch}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search Name *
                  </label>
                  <input
                    type="text"
                    value={saveSearchName}
                    onChange={(e) => setSaveSearchName(e.target.value)}
                    placeholder="e.g., Kitesurfing jobs in Portugal"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Frequency *
                  </label>
                  <select
                    value={saveSearchFrequency}
                    onChange={(e) => setSaveSearchFrequency(e.target.value as 'daily' | 'weekly' | 'never')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="never">Never</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {saveSearchFrequency === 'never' 
                      ? 'No email alerts will be sent. You can still view and manage this saved search.'
                      : 'You\'ll receive email alerts when new jobs match your search criteria.'}
                  </p>
                </div>
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-700 mb-2">Current Search Criteria:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {keyword && <li>• Keyword: <strong>{keyword}</strong></li>}
                    {location && <li>• Location: <strong>{location}</strong></li>}
                    {selectedCountry && <li>• Country: <strong>{getCountryNameFromCode(selectedCountry)}</strong></li>}
                    {selectedCategory && <li>• Category: <strong>{selectedCategory}</strong></li>}
                    {selectedActivity && <li>• Activity: <strong>{selectedActivity}</strong></li>}
                    {selectedLanguage && <li>• Language: <strong>{selectedLanguage}</strong></li>}
                    {selectedCity && <li>• City: <strong>{selectedCity}</strong></li>}
                    {!keyword && !location && !selectedCountry && !selectedCategory && !selectedActivity && !selectedLanguage && !selectedCity && (
                      <li className="text-gray-500">No filters applied</li>
                    )}
                  </ul>
                </div>
                {saveSearchMessage && (
                  <div className={`mb-4 p-3 rounded-md ${
                    saveSearchMessage.includes('successfully') 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {saveSearchMessage}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={savingSearch}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingSearch ? 'Saving...' : 'Save Search'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSaveSearchModal(false)}
                    disabled={savingSearch}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Wrapper component with Suspense boundary for useSearchParams
export default function JobsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">Loading jobs...</div>
        </main>
      </div>
    }>
      <JobsPageContent />
    </Suspense>
  );
}
