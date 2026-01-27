'use client';
// Force Vercel rebuild

import { useEffect, useState, useRef, Suspense } from 'react';
import Image from 'next/image';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import JobSelectionModal from '../components/JobSelectionModal';
import {
  parseCandidateSearchParams,
  buildCandidateSearchUrl,
  buildCandidateSearchQuery,
  type CandidateSearchParams
} from '@/lib/candidateSearchParams';

interface CV {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  summary?: string;
  experienceAndSkill?: string[];
  languages?: string[];
  lookingForWorkInAreas?: string[];
  professionalCertifications?: string[];
  pictures?: string[];
  jobSeeker: {
    _id: string;
    name: string;
    email: string;
    lastOnline?: string;
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

function CandidatesContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL params immediately if available
  const urlParams = searchParams ? parseCandidateSearchParams(searchParams) : null;

  const [cvs, setCvs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search state (synced with URL)
  const [keyword, setKeyword] = useState<string>(urlParams?.kw || '');
  const [location, setLocation] = useState<string>(urlParams?.location || '');

  // Separate state for search bar inputs (don't trigger CV loading until submit)
  const [searchKeyword, setSearchKeyword] = useState<string>(urlParams?.kw || '');
  const [searchLocation, setSearchLocation] = useState<string>(urlParams?.location || '');

  // Filter state (synced with URL) - arrays for multi-select support
  const [selectedLanguage, setSelectedLanguage] = useState<string[]>(urlParams?.language || []);
  const [selectedWorkArea, setSelectedWorkArea] = useState<string[]>(urlParams?.workArea || []);
  const [selectedSport, setSelectedSport] = useState<string[]>(urlParams?.sport || []);
  const [selectedCertification, setSelectedCertification] = useState<string[]>(urlParams?.certification || []);
  const [selectedExperienceLevel, setSelectedExperienceLevel] = useState<string[]>(urlParams?.experienceLevel || []);
  const [selectedAvailability, setSelectedAvailability] = useState<string[]>(urlParams?.availability || []);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Pagination state (synced with URL)
  const [currentPage, setCurrentPage] = useState<number>(urlParams?.page || 1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Filter options from API
  const [filterOptions, setFilterOptions] = useState<{
    languages: string[];
    workAreas: string[];
    sports: string[];
    certifications: string[];
    experienceLevels: string[];
    availability: string[];
  }>({
    languages: [],
    workAreas: [],
    sports: [],
    certifications: [],
    experienceLevels: [],
    availability: [],
  });

  const [contactedCandidates, setContactedCandidates] = useState<Set<string>>(new Set());
  const [contactingCandidate, setContactingCandidate] = useState<string | null>(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [pendingCandidateId, setPendingCandidateId] = useState<string | null>(null);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [showContactSuccessModal, setShowContactSuccessModal] = useState(false);

  // Multi-select dropdown state
  const [workAreaDropdownOpen, setWorkAreaDropdownOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'recruiter' && user.role !== 'admin') {
      router.push(`/${user.role === 'job-seeker' ? 'job-seeker' : ''}`);
    }
  }, [user, authLoading, router]);

  // Sync state with URL query parameters when URL changes (browser back/forward)
  useEffect(() => {
    if (!searchParams) return;

    // Skip on initial mount - state is already initialized from URL params above
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Parse all supported search parameters from URL using canonical parser
    const urlParams = parseCandidateSearchParams(searchParams);

    // Update state from URL parameters
    setKeyword(urlParams.kw || '');
    setLocation(urlParams.location || '');
    setSearchKeyword(urlParams.kw || '');
    setSearchLocation(urlParams.location || '');
    setSelectedLanguage(urlParams.language || []);
    setSelectedWorkArea(urlParams.workArea || []);
    setSelectedSport(urlParams.sport || []);
    setSelectedCertification(urlParams.certification || []);
    setSelectedExperienceLevel(urlParams.experienceLevel || []);
    setSelectedAvailability(urlParams.availability || []);
    setCurrentPage(urlParams.page || 1);
  }, [searchParams]);

  // Reload CVs when filters or page change (API handles filtering server-side)
  useEffect(() => {
    if (user && (user.role === 'recruiter' || user.role === 'admin')) {
      loadCVs();
    }
  }, [user, selectedLanguage, selectedWorkArea, selectedSport, selectedCertification, selectedExperienceLevel, selectedAvailability, keyword, location, currentPage]);

  useEffect(() => {
    if (user && (user.role === 'recruiter' || user.role === 'admin')) {
      loadContactedCandidates();
    }
  }, [user]);

  const loadContactedCandidates = async () => {
    try {
      const response = await fetch('/api/applications', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const contacted = new Set<string>();
        (data.applications || []).forEach((app: any) => {
          // Handle both populated object and ObjectId formats
          let candidateId: string | null = null;
          if (app.candidateId) {
            if (typeof app.candidateId === 'object' && app.candidateId._id) {
              candidateId = String(app.candidateId._id);
            } else {
              candidateId = String(app.candidateId);
            }
          }
          if (candidateId) {
            contacted.add(candidateId);
          }
        });
        setContactedCandidates(contacted);
      }
    } catch (err: any) {
      // Silently fail - not critical
      console.error('Failed to load contacted candidates:', err);
    }
  };

  const handleContactCandidate = async (e: React.MouseEvent, candidateId: string, jobId?: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (contactingCandidate || contactedCandidates.has(candidateId)) return;

    setContactingCandidate(candidateId);

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ candidateId, jobId }),
      });

      const data = await response.json();

      if (response.ok) {
        setContactedCandidates((prev) => new Set(prev).add(candidateId));
        setShowContactSuccessModal(true);
        setShowJobModal(false);
        setPendingCandidateId(null);
        setAvailableJobs([]);
      } else if (data.jobs && Array.isArray(data.jobs)) {
        // Multiple jobs available - show selection modal
        setAvailableJobs(data.jobs);
        setPendingCandidateId(candidateId);
        setShowJobModal(true);
        setContactingCandidate(null);
      } else {
        alert(data.error || 'Failed to contact candidate. Please try again.');
      }
    } catch (err: any) {
      alert('Failed to contact candidate. Please try again.');
    } finally {
      if (!showJobModal) {
        setContactingCandidate(null);
      }
    }
  };

  const handleJobSelect = (jobId: string) => {
    if (pendingCandidateId) {
      handleContactCandidate(
        { preventDefault: () => { }, stopPropagation: () => { } } as React.MouseEvent,
        pendingCandidateId,
        jobId
      );
    }
  };

  // Handler to update multi-select filter and URL
  const handleMultiSelectFilterChange = (
    filterType: 'language' | 'workArea' | 'sport' | 'certification' | 'experienceLevel' | 'availability',
    value: string,
    checked: boolean
  ) => {
    // Build clean URL params using canonical utility
    const currentParams = searchParams ? parseCandidateSearchParams(searchParams) : {};
    const newParams: CandidateSearchParams = { ...currentParams };

    // Get current values for this filter
    const currentValues = newParams[filterType] || [];
    let newValues: string[];

    if (checked) {
      // Add value if not already present
      newValues = currentValues.includes(value) ? currentValues : [...currentValues, value];
    } else {
      // Remove value
      newValues = currentValues.filter(v => v !== value);
    }

    // Update the filter in params
    if (newValues.length > 0) {
      newParams[filterType] = newValues;
    } else {
      delete newParams[filterType];
    }

    // Update local state
    if (filterType === 'language') setSelectedLanguage(newValues);
    if (filterType === 'workArea') setSelectedWorkArea(newValues);
    if (filterType === 'sport') setSelectedSport(newValues);
    if (filterType === 'certification') setSelectedCertification(newValues);
    if (filterType === 'experienceLevel') setSelectedExperienceLevel(newValues);
    if (filterType === 'availability') setSelectedAvailability(newValues);

    // Reset to page 1 when filters change
    newParams.page = 1;

    const newUrl = buildCandidateSearchUrl('/candidates', newParams);
    router.push(newUrl);
  };

  // Handler to clear a specific filter
  const handleClearFilter = (filterType: 'language' | 'workArea' | 'sport' | 'certification' | 'experienceLevel' | 'availability') => {
    const currentParams = searchParams ? parseCandidateSearchParams(searchParams) : {};
    const newParams: CandidateSearchParams = { ...currentParams };

    delete newParams[filterType];
    newParams.page = 1;

    // Update local state
    if (filterType === 'language') setSelectedLanguage([]);
    if (filterType === 'workArea') setSelectedWorkArea([]);
    if (filterType === 'sport') setSelectedSport([]);
    if (filterType === 'certification') setSelectedCertification([]);
    if (filterType === 'experienceLevel') setSelectedExperienceLevel([]);
    if (filterType === 'availability') setSelectedAvailability([]);

    const newUrl = buildCandidateSearchUrl('/candidates', newParams);
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
    const currentParams = searchParams ? parseCandidateSearchParams(searchParams) : {};
    const newParams: CandidateSearchParams = { ...currentParams };

    if (filterType === 'keyword') {
      delete newParams.kw;
    }
    if (filterType === 'location') {
      delete newParams.location;
    }

    // Reset to page 1 when search filters change (preserves all other filters)
    newParams.page = 1;

    const newUrl = buildCandidateSearchUrl('/candidates', newParams);
    router.push(newUrl);
  };

  // Handler to remove a single value from a multi-select filter
  const handleRemoveFilterValue = (
    filterType: 'language' | 'workArea' | 'sport' | 'certification' | 'experienceLevel' | 'availability',
    value: string
  ) => {
    const currentParams = searchParams ? parseCandidateSearchParams(searchParams) : {};
    const newParams: CandidateSearchParams = { ...currentParams };

    // Get current values and remove the specified value
    const currentValues = newParams[filterType] || [];
    const newValues = currentValues.filter(v => v !== value);

    // Update the filter in params
    if (newValues.length > 0) {
      newParams[filterType] = newValues;
    } else {
      delete newParams[filterType];
    }

    // Update local state
    if (filterType === 'language') setSelectedLanguage(newValues);
    if (filterType === 'workArea') setSelectedWorkArea(newValues);
    if (filterType === 'sport') setSelectedSport(newValues);
    if (filterType === 'certification') setSelectedCertification(newValues);
    if (filterType === 'experienceLevel') setSelectedExperienceLevel(newValues);
    if (filterType === 'availability') setSelectedAvailability(newValues);

    // Reset to page 1 when filters change
    newParams.page = 1;

    const newUrl = buildCandidateSearchUrl('/candidates', newParams);
    router.push(newUrl);
  };

  // Handler to clear all filters
  const handleClearAllFilters = () => {
    // Reset all state variables (matches job search behavior)
    setKeyword('');
    setLocation('');
    setSearchKeyword('');
    setSearchLocation('');
    setSelectedLanguage([]);
    setSelectedWorkArea([]);
    setSelectedSport([]);
    setSelectedCertification([]);
    setSelectedExperienceLevel([]);
    setSelectedAvailability([]);
    setCurrentPage(1);

    // Navigate to /candidates with no query parameters
    router.push('/candidates');
  };

  // Handler for keyword/location search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Build clean URL params using canonical utility (preserve existing params like filters)
    const currentParams = searchParams ? parseCandidateSearchParams(searchParams) : {};
    const newParams: CandidateSearchParams = { ...currentParams };

    // Update keyword and location params from search bar inputs
    if (searchKeyword.trim()) {
      newParams.kw = searchKeyword.trim();
    } else {
      delete newParams.kw;
    }

    if (searchLocation.trim()) {
      newParams.location = searchLocation.trim();
    } else {
      delete newParams.location;
    }

    // Reset to page 1 when search changes
    newParams.page = 1;

    // Update URL - this will trigger the useEffect that syncs state and loads CVs
    const newUrl = buildCandidateSearchUrl('/candidates', newParams);
    router.push(newUrl);
  };

  const loadCVs = async () => {
    try {
      setLoading(true);

      // Build query string from current state using canonical URL builder
      // This ensures consistency with URL format (comma-separated values, correct parameter names)
      const params: CandidateSearchParams = {};
      if (keyword) params.kw = keyword;
      if (location) params.location = location;
      if (selectedLanguage.length > 0) params.language = selectedLanguage;
      if (selectedWorkArea.length > 0) params.workArea = selectedWorkArea;
      if (selectedSport.length > 0) params.sport = selectedSport;
      if (selectedCertification.length > 0) params.certification = selectedCertification;
      if (selectedExperienceLevel.length > 0) params.experienceLevel = selectedExperienceLevel;
      if (selectedAvailability.length > 0) params.availability = selectedAvailability;
      if (currentPage > 1) params.page = currentPage;

      const queryString = buildCandidateSearchQuery(params);
      const endpoint = queryString ? `/api/candidates-list?${queryString}` : '/api/candidates-list';

      const response = await fetch(endpoint, {
        credentials: 'include',
      });

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to load CVs';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setCvs(data.cvs || []);

      // Set pagination metadata
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
        setTotalCount(data.pagination.total || 0);
      }

      // Set filter options from backend (pre-computed, more efficient)
      if (data.filters) {
        setFilterOptions({
          languages: data.filters.languages || [],
          workAreas: data.filters.workAreas || [],
          sports: data.filters.sports || [],
          certifications: data.filters.certifications || [],
          experienceLevels: data.filters.experienceLevels || [],
          availability: data.filters.availability || [],
        });
      }
    } catch (err: any) {
      console.error('Error loading CVs:', err);
      setError(err.message || 'Failed to load CVs');
    } finally {
      setLoading(false);
    }
  };

  // Use filter options from backend (pre-computed, no need to iterate)
  const getUniqueLanguages = (): string[] => filterOptions.languages;
  const getUniqueWorkAreas = (): string[] => filterOptions.workAreas;
  const getUniqueSports = (): string[] => filterOptions.sports;
  const getUniqueCertifications = (): string[] => filterOptions.certifications;

  if (authLoading || loading) {
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
            <div className="flex flex-col gap-3">
              {/* First Row: Keyword, Location, Search Button */}
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

              {/* Second Row: Primary Filters (Work Area, Language) */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                {/* Work Area Multi-Select Dropdown */}
                <div className="flex-1 relative">
                  <label htmlFor="workarea-filter-top" className="block text-xs text-gray-600 mb-1">
                    Work Area
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      id="workarea-filter-top"
                      onClick={() => {
                        setWorkAreaDropdownOpen(!workAreaDropdownOpen);
                        setLanguageDropdownOpen(false);
                      }}
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white text-left flex items-center justify-between"
                    >
                      <span className="truncate">
                        {selectedWorkArea.length === 0
                          ? 'All Work Areas'
                          : selectedWorkArea.length === 1
                            ? selectedWorkArea[0]
                            : `${selectedWorkArea.length} selected`}
                      </span>
                      <svg
                        className={`w-4 h-4 transition-transform ${workAreaDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {workAreaDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setWorkAreaDropdownOpen(false)}
                        />
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          <div className="p-2 space-y-1">
                            {getUniqueWorkAreas().map((area) => (
                              <label
                                key={area}
                                className="flex items-center px-3 py-2 hover:bg-gray-50 rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedWorkArea.includes(area)}
                                  onChange={(e) => {
                                    handleMultiSelectFilterChange('workArea', area, e.target.checked);
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">{area}</span>
                              </label>
                            ))}
                          </div>
                          {selectedWorkArea.length > 0 && (
                            <div className="border-t border-gray-200 p-2">
                              <button
                                type="button"
                                onClick={() => {
                                  handleClearFilter('workArea');
                                  setWorkAreaDropdownOpen(false);
                                }}
                                className="w-full text-xs text-gray-600 hover:text-gray-800 text-center py-1"
                              >
                                Clear selection
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Language Multi-Select Dropdown */}
                <div className="flex-1 relative">
                  <label htmlFor="language-filter-top" className="block text-xs text-gray-600 mb-1">
                    Language
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      id="language-filter-top"
                      onClick={() => {
                        setLanguageDropdownOpen(!languageDropdownOpen);
                        setWorkAreaDropdownOpen(false);
                      }}
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white text-left flex items-center justify-between"
                    >
                      <span className="truncate">
                        {selectedLanguage.length === 0
                          ? 'All Languages'
                          : selectedLanguage.length === 1
                            ? selectedLanguage[0]
                            : `${selectedLanguage.length} selected`}
                      </span>
                      <svg
                        className={`w-4 h-4 transition-transform ${languageDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {languageDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setLanguageDropdownOpen(false)}
                        />
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          <div className="p-2 space-y-1">
                            {getUniqueLanguages().map((language) => (
                              <label
                                key={language}
                                className="flex items-center px-3 py-2 hover:bg-gray-50 rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedLanguage.includes(language)}
                                  onChange={(e) => {
                                    handleMultiSelectFilterChange('language', language, e.target.checked);
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">{language}</span>
                              </label>
                            ))}
                          </div>
                          {selectedLanguage.length > 0 && (
                            <div className="border-t border-gray-200 p-2">
                              <button
                                type="button"
                                onClick={() => {
                                  handleClearFilter('language');
                                  setLanguageDropdownOpen(false);
                                }}
                                className="w-full text-xs text-gray-600 hover:text-gray-800 text-center py-1"
                              >
                                Clear selection
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Main Content Layout: Sidebar + Candidates Grid */}
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
                {/* Sports Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sports
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {getUniqueSports().map((sport) => (
                      <label key={sport} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedSport.includes(sport)}
                          onChange={(e) => handleMultiSelectFilterChange('sport', sport, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{sport}</span>
                      </label>
                    ))}
                  </div>
                  {selectedSport.length > 0 && (
                    <button
                      onClick={() => handleClearFilter('sport')}
                      className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Certifications Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Certifications
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {getUniqueCertifications().map((cert) => (
                      <label key={cert} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedCertification.includes(cert)}
                          onChange={(e) => handleMultiSelectFilterChange('certification', cert, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{cert}</span>
                      </label>
                    ))}
                  </div>
                  {selectedCertification.length > 0 && (
                    <button
                      onClick={() => handleClearFilter('certification')}
                      className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Experience Level Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Experience Level
                  </label>
                  <div className="space-y-2">
                    {filterOptions.experienceLevels.map((level) => {
                      const labels: Record<string, string> = {
                        'entry': 'Entry',
                        'intermediate': 'Intermediate',
                        'experienced': 'Experienced',
                        'senior': 'Senior',
                      };
                      return (
                        <label key={level} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedExperienceLevel.includes(level)}
                            onChange={(e) => handleMultiSelectFilterChange('experienceLevel', level, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">{labels[level] || level}</span>
                        </label>
                      );
                    })}
                  </div>
                  {selectedExperienceLevel.length > 0 && (
                    <button
                      onClick={() => handleClearFilter('experienceLevel')}
                      className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Availability Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Availability
                  </label>
                  <div className="space-y-2">
                    {filterOptions.availability.map((avail) => {
                      const labels: Record<string, string> = {
                        'available_now': 'Available Now',
                        'available_soon': 'Available Soon',
                        'seasonal': 'Seasonal',
                        'not_available': 'Not Available',
                      };
                      return (
                        <label key={avail} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedAvailability.includes(avail)}
                            onChange={(e) => handleMultiSelectFilterChange('availability', avail, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">{labels[avail] || avail}</span>
                        </label>
                      );
                    })}
                  </div>
                  {selectedAvailability.length > 0 && (
                    <button
                      onClick={() => handleClearFilter('availability')}
                      className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      Clear
                    </button>
                  )}
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
                    {totalCount > 0
                      ? `We have ${totalCount} ${totalCount === 1 ? 'candidate' : 'candidates'} meeting these criteria`
                      : 'No candidates found matching these criteria'
                    }
                  </h1>
                </div>
              </div>
            </div>


            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {/* Active Filter Chips */}
            {(keyword || location || selectedLanguage.length > 0 || selectedWorkArea.length > 0 || selectedSport.length > 0 || selectedCertification.length > 0 || selectedExperienceLevel.length > 0 || selectedAvailability.length > 0) && (
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
                    {selectedWorkArea.map((area) => (
                      <div key={area} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        <span>Work Area: <strong>{area}</strong></span>
                        <button
                          onClick={() => handleRemoveFilterValue('workArea', area)}
                          className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                          aria-label={`Remove ${area} work area filter`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {selectedLanguage.map((lang) => (
                      <div key={lang} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        <span>Language: <strong>{lang}</strong></span>
                        <button
                          onClick={() => handleRemoveFilterValue('language', lang)}
                          className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                          aria-label={`Remove ${lang} language filter`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {selectedSport.map((sport) => (
                      <div key={sport} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        <span>Sport: <strong>{sport}</strong></span>
                        <button
                          onClick={() => handleRemoveFilterValue('sport', sport)}
                          className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                          aria-label={`Remove ${sport} sport filter`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {selectedCertification.map((cert) => (
                      <div key={cert} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        <span>Certification: <strong>{cert}</strong></span>
                        <button
                          onClick={() => handleRemoveFilterValue('certification', cert)}
                          className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                          aria-label={`Remove ${cert} certification filter`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {selectedExperienceLevel.map((level) => {
                      const labels: Record<string, string> = {
                        'entry': 'Entry',
                        'intermediate': 'Intermediate',
                        'experienced': 'Experienced',
                        'senior': 'Senior',
                      };
                      return (
                        <div key={level} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          <span>Experience: <strong>{labels[level] || level}</strong></span>
                          <button
                            onClick={() => handleRemoveFilterValue('experienceLevel', level)}
                            className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                            aria-label={`Remove ${labels[level] || level} experience level filter`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                    {selectedAvailability.map((avail) => {
                      const labels: Record<string, string> = {
                        'available_now': 'Available Now',
                        'available_soon': 'Available Soon',
                        'seasonal': 'Seasonal',
                        'not_available': 'Not Available',
                      };
                      return (
                        <div key={avail} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          <span>Availability: <strong>{labels[avail] || avail}</strong></span>
                          <button
                            onClick={() => handleRemoveFilterValue('availability', avail)}
                            className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                            aria-label={`Remove ${labels[avail] || avail} availability filter`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
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

            {cvs.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-600">No CVs available at the moment.</p>
                <p className="text-gray-500 mt-2">Check back later for new candidates!</p>
              </div>
            ) : (
              <>
                {/* Candidate Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {cvs.map((cv) => {
                    // Get the first picture, or use a placeholder
                    const firstPicture = cv.pictures && cv.pictures.length > 0
                      ? cv.pictures[0]
                      : null;

                    // Get user's last online date
                    const lastOnlineDate = cv.jobSeeker?.lastOnline;

                    return (
                      <Link
                        key={cv._id}
                        href={`/candidates/${cv._id}`}
                        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer block"
                      >
                        {/* CV Picture */}
                        <div className="w-full h-48 bg-gray-200 relative overflow-hidden">
                          {firstPicture ? (
                            <Image
                              src={firstPicture}
                              alt={cv.fullName}
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

                        {/* CV Info */}
                        <div className="p-4">
                          <h2 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                            {cv.fullName}
                          </h2>

                          {/* Summary Preview */}
                          {cv.summary && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {cv.summary}
                            </p>
                          )}

                          {/* Skills Preview */}
                          {cv.experienceAndSkill && cv.experienceAndSkill.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {cv.experienceAndSkill.slice(0, 3).map((skill, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                                >
                                  {skill}
                                </span>
                              ))}
                              {cv.experienceAndSkill.length > 3 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                  +{cv.experienceAndSkill.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Work Areas Preview */}
                          {cv.lookingForWorkInAreas && cv.lookingForWorkInAreas.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {cv.lookingForWorkInAreas.slice(0, 2).map((area, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium"
                                >
                                  {area}
                                </span>
                              ))}
                              {cv.lookingForWorkInAreas.length > 2 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                  +{cv.lookingForWorkInAreas.length - 2}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Languages Preview */}
                          {cv.languages && cv.languages.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {cv.languages.slice(0, 2).map((lang, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium"
                                >
                                  {lang}
                                </span>
                              ))}
                              {cv.languages.length > 2 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                  +{cv.languages.length - 2}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Location and Last Online */}
                          <div className="flex flex-col gap-1 mt-2">
                            {cv.address && (
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <span>📍</span>
                                <span className="font-medium text-gray-800">{cv.address}</span>
                              </p>
                            )}
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">Last logged in:</span>
                              {lastOnlineDate ? (
                                <TimeAgoDisplay date={lastOnlineDate} />
                              ) : (
                                <span className="text-xs text-gray-500">Never</span>
                              )}
                            </div>
                          </div>

                          {/* Contact Candidate Button */}
                          {user && (user.role === 'recruiter' || user.role === 'admin') && cv.jobSeeker && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              {(() => {
                                const candidateId = cv.jobSeeker?._id ? String(cv.jobSeeker._id) : null;
                                if (!candidateId) return null;

                                return contactedCandidates.has(candidateId) ? (
                                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-md text-sm font-medium">
                                    <span>✓</span>
                                    <span>Contacted</span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => handleContactCandidate(e, candidateId)}
                                    disabled={contactingCandidate === candidateId}
                                    className="w-full px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {contactingCandidate === candidateId
                                      ? 'Contacting...'
                                      : 'Contact Candidate'}
                                  </button>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        const newParams = searchParams ? parseCandidateSearchParams(searchParams) : {};
                        newParams.page = Math.max((newParams.page || 1) - 1, 1);
                        const newUrl = buildCandidateSearchUrl('/candidates', newParams);
                        router.push(newUrl);
                      }}
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
                              onClick={() => {
                                const newParams = searchParams ? parseCandidateSearchParams(searchParams) : {};
                                newParams.page = page;
                                const newUrl = buildCandidateSearchUrl('/candidates', newParams);
                                router.push(newUrl);
                              }}
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
                      onClick={() => {
                        const newParams = searchParams ? parseCandidateSearchParams(searchParams) : {};
                        newParams.page = Math.min((newParams.page || 1) + 1, totalPages);
                        const newUrl = buildCandidateSearchUrl('/candidates', newParams);
                        router.push(newUrl);
                      }}
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
                    Showing page {currentPage} of {totalPages} ({totalCount} total candidates)
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      <JobSelectionModal
        isOpen={showJobModal}
        jobs={availableJobs}
        onSelect={handleJobSelect}
        onClose={() => {
          setShowJobModal(false);
          setPendingCandidateId(null);
          setAvailableJobs([]);
          setContactingCandidate(null);
        }}
        candidateName={
          pendingCandidateId
            ? cvs.find((cv) => cv.jobSeeker?._id === pendingCandidateId)?.fullName
            : undefined
        }
      />

      {/* Contact Success Modal */}
      {showContactSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="mb-4 flex justify-center items-center" style={{ minHeight: '200px' }}>
              <img
                src="/success-chicken.gif"
                alt="Success"
                className="max-w-xs w-auto h-auto"
                style={{ maxHeight: '300px', display: 'block', objectFit: 'contain' }}
                onError={(e) => {
                  console.error('Failed to load success GIF:', e);
                }}
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Candidate contacted
            </h2>
            <p className="text-gray-600 mb-6">
              Chickenloop has sent an email to this candidate letting them know that you are interested in their profile.
              The candidate has been invited to contact you directly or submit an application.
            </p>
            <button
              onClick={() => setShowContactSuccessModal(false)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CVsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    }>
      <CandidatesContent />
    </Suspense>
  );
}

