'use client';
// Force Vercel rebuild

import { useEffect, useState, useCallback, Suspense } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { buildCandidateSearchQuery } from '@/lib/candidateSearchParams';
import { candidatesApi } from '@/lib/api';

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
  featured?: boolean;
  jobSeeker: {
    _id: string;
    name: string;
    email: string;
    lastOnline?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

// Strip HTML tags from string for plain-text display (e.g. card previews)
function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
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

function CVsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [migrationBannerDismissed, setMigrationBannerDismissed] = useState(true); // start true to avoid flash; useEffect will set from localStorage
  const [cvs, setCvs] = useState<CV[]>([]);
  const [filterOptions, setFilterOptions] = useState<{
    languages: string[];
    workAreas: string[];
    sports: string[];
    certifications: string[];
  }>({ languages: [], workAreas: [], sports: [], certifications: [] });
  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }>({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [selectedWorkArea, setSelectedWorkArea] = useState<string>('');
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [selectedCertification, setSelectedCertification] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [favouriteCvIds, setFavouriteCvIds] = useState<Set<string>>(new Set());
  const [togglingFavouriteId, setTogglingFavouriteId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'recruiter' && user.role !== 'admin') {
      router.push(`/${user.role === 'job-seeker' ? 'job-seeker' : ''}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    setMigrationBannerDismissed(localStorage.getItem('candidates-migration-banner-dismissed') === '1');
  }, []);

  const dismissMigrationBanner = () => {
    localStorage.setItem('candidates-migration-banner-dismissed', '1');
    setMigrationBannerDismissed(true);
  };

  // Sync page and filters from URL when searchParams change (e.g. navigation, pagination)
  useEffect(() => {
    const pageParam = searchParams.get('page');
    const p = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
    setCurrentPage(p);
    setSelectedLanguage(searchParams.get('language') || '');
    setSelectedWorkArea(searchParams.get('work_area') || '');
    setSelectedSport(searchParams.get('sports') || '');
    setSelectedCertification(searchParams.get('certifications') || '');
  }, [searchParams]);

  const loadCVs = useCallback(async () => {
    if (!user || (user.role !== 'recruiter' && user.role !== 'admin')) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      const page = searchParams.get('page');
      const p = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
      if (p > 1) params.set('page', String(p));
      const lang = searchParams.get('language');
      if (lang) params.set('language', lang);
      const workArea = searchParams.get('work_area');
      if (workArea) params.set('work_area', workArea);
      const sport = searchParams.get('sports');
      if (sport) params.set('sports', sport);
      const cert = searchParams.get('certifications');
      if (cert) params.set('certifications', cert);
      const queryString = params.toString();
      const url = `/api/candidates-list${queryString ? `?${queryString}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        throw new Error('Failed to load CVs');
      }

      const data = await response.json();
      setCvs(data.cvs || []);
      setFilterOptions({
        languages: data.filters?.languages || [],
        workAreas: data.filters?.workAreas || [],
        sports: data.filters?.sports || [],
        certifications: data.filters?.certifications || [],
      });
      setPagination(data.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 1 });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load CVs');
    } finally {
      setLoading(false);
    }
  }, [user, searchParams]);

  useEffect(() => {
    if (user && (user.role === 'recruiter' || user.role === 'admin')) {
      loadCVs();
    }
  }, [user, loadCVs]);

  useEffect(() => {
    if (user && (user.role === 'recruiter' || user.role === 'admin')) {
      candidatesApi.getFavourites().then((data: { cvs?: { _id: string }[] }) => {
        const ids = new Set((data.cvs || []).map((c) => String(c._id)));
        setFavouriteCvIds(ids);
      }).catch(() => {});
    }
  }, [user]);

  const handleToggleFavourite = useCallback(async (e: React.MouseEvent, cvId: string) => {
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
      // keep UI state unchanged on error
    } finally {
      setTogglingFavouriteId(null);
    }
  }, [togglingFavouriteId]);

  const goToPage = (page: number) => {
    const p = Math.max(1, Math.min(page, pagination.totalPages));
    setCurrentPage(p);
    router.push(`/candidates?${buildCandidateSearchQuery({
      page: p,
      ...(selectedLanguage && { language: [selectedLanguage] }),
      ...(selectedWorkArea && { workArea: [selectedWorkArea] }),
      ...(selectedSport && { sport: [selectedSport] }),
      ...(selectedCertification && { certification: [selectedCertification] }),
    })}`);
  };

  const handleFilterChange = (filter: 'language' | 'workArea' | 'sport' | 'certification', value: string) => {
    const updates = { language: selectedLanguage, workArea: selectedWorkArea, sport: selectedSport, certification: selectedCertification };
    if (filter === 'language') {
      setSelectedLanguage(value);
      updates.language = value;
    } else if (filter === 'workArea') {
      setSelectedWorkArea(value);
      updates.workArea = value;
    } else if (filter === 'sport') {
      setSelectedSport(value);
      updates.sport = value;
    } else {
      setSelectedCertification(value);
      updates.certification = value;
    }
    setCurrentPage(1);
    const q = buildCandidateSearchQuery({
      page: 1,
      ...(updates.language && { language: [updates.language] }),
      ...(updates.workArea && { workArea: [updates.workArea] }),
      ...(updates.sport && { sport: [updates.sport] }),
      ...(updates.certification && { certification: [updates.certification] }),
    });
    router.push(q ? `/candidates?${q}` : '/candidates');
  };

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
      {!migrationBannerDismissed && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-amber-900">
            <span className="text-xl shrink-0" aria-hidden>🚧</span>
            <span className="text-sm sm:text-base">Note: Data still incomplete and under migration from the old site.</span>
          </div>
          <button
            type="button"
            onClick={dismissMigrationBanner}
            className="shrink-0 text-sm font-medium text-amber-800 hover:text-amber-900 underline focus:outline-none focus:ring-2 focus:ring-amber-500 rounded px-1"
          >
            Dismiss
          </button>
        </div>
      )}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Job Candidates</h1>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center sm:justify-end mb-8 gap-3 flex-wrap">
            {/* Language Filter */}
            <select
              id="language-filter"
              value={selectedLanguage}
              onChange={(e) => handleFilterChange('language', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white min-w-[200px]"
            >
              <option value="">All Languages</option>
              {filterOptions.languages.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>

            {/* Work Area Filter */}
            <select
              id="workarea-filter"
              value={selectedWorkArea}
              onChange={(e) => handleFilterChange('workArea', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white min-w-[200px]"
            >
              <option value="">All Work Areas</option>
              {filterOptions.workAreas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>

            {/* Sports Experiences Filter */}
            <select
              id="sport-filter"
              value={selectedSport}
              onChange={(e) => handleFilterChange('sport', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white min-w-[200px]"
            >
              <option value="">All Sports</option>
              {filterOptions.sports.map((sport) => (
                <option key={sport} value={sport}>
                  {sport}
                </option>
              ))}
            </select>

            {/* Professional Certifications Filter */}
            <select
              id="certification-filter"
              value={selectedCertification}
              onChange={(e) => handleFilterChange('certification', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white min-w-[200px]"
            >
              <option value="">All Certifications</option>
              {filterOptions.certifications.map((cert) => (
                <option key={cert} value={cert}>
                  {cert}
                </option>
              ))}
            </select>

            {/* Clear Filters Button */}
            {(selectedLanguage || selectedWorkArea || selectedSport || selectedCertification) && (
              <button
                onClick={() => {
                  setSelectedLanguage('');
                  setSelectedWorkArea('');
                  setSelectedSport('');
                  setSelectedCertification('');
                  setCurrentPage(1);
                  router.push('/candidates');
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 underline whitespace-nowrap"
              >
                Clear Filters
              </button>
            )}
          </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {(selectedLanguage || selectedWorkArea || selectedSport || selectedCertification) && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-4">
            Showing candidates
            {selectedLanguage && (
              <span> with language: <strong>{selectedLanguage}</strong></span>
            )}
            {selectedWorkArea && (
              <span>
                {selectedLanguage ? ',' : ''} work area: <strong>{selectedWorkArea}</strong>
              </span>
            )}
            {selectedSport && (
              <span>
                {(selectedLanguage || selectedWorkArea) ? ',' : ''} sports experience: <strong>{selectedSport}</strong>
              </span>
            )}
            {selectedCertification && (
              <span>
                {(selectedLanguage || selectedWorkArea || selectedSport) ? ',' : ''} certification: <strong>{selectedCertification}</strong>
              </span>
            )}
            {' '}({pagination.total} {pagination.total === 1 ? 'candidate' : 'candidates'})
          </div>
        )}

        {!error && pagination.total > 0 && (
          <div className="text-sm text-gray-600 mb-4">
            Showing {Math.min((pagination.page - 1) * pagination.pageSize + 1, pagination.total)} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} candidates
          </div>
        )}

        {cvs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">No CVs available at the moment.</p>
            <p className="text-gray-500 mt-2">Check back later for new candidates!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {cvs.map((cv) => {
              // Get the first picture, or use a placeholder
              const firstPicture = cv.pictures && cv.pictures.length > 0
                ? cv.pictures[0]
                : null;

              // Get user's last online date (fallback to CV updatedAt for users without lastOnline set yet)
              const lastOnlineDate = cv.jobSeeker?.lastOnline || cv.updatedAt;

              const isFavourite = favouriteCvIds.has(cv._id);
              const showHeart = user && (user.role === 'recruiter' || user.role === 'admin');

              return (
                <Link
                  key={cv._id}
                  href={`/candidates/${cv._id}`}
                  className={`rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer block relative ${cv.featured
                    ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300'
                    : 'bg-white'
                    }`}
                >
                  {/* CV Picture */}
                  <div className="w-full h-48 bg-gray-200 relative overflow-hidden">
                    {cv.featured && (
                      <div className="absolute top-2 left-2 z-10 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-md text-xs font-bold shadow-md">
                        ⭐ Featured
                      </div>
                    )}
                    {firstPicture ? (
                      <img
                        src={firstPicture}
                        alt={cv.fullName}
                        className="w-full h-full object-cover"
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
                        {stripHtml(cv.summary)}
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
                        <span className="text-xs text-gray-500">Last online:</span>
                        {lastOnlineDate ? (
                          <TimeAgoDisplay date={lastOnlineDate} />
                        ) : (
                          <span className="text-xs text-gray-500">Never</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Favourite heart - bottom right (recruiter only) */}
                  {showHeart && (
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavourite(e, cv._id)}
                      disabled={togglingFavouriteId === cv._id}
                      className="absolute bottom-2 right-2 z-10 p-1.5 rounded-full bg-white/90 hover:bg-white shadow-md text-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-60"
                      aria-label={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
                    >
                      {isFavourite ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                        </svg>
                      )}
                    </button>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  pagination.page <= 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(7, pagination.totalPages) }, (_, i) => {
                  let pageNum: number;
                  const total = pagination.totalPages;
                  const page = pagination.page;
                  if (total <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= total - 3) {
                    pageNum = Math.max(1, total - 6) + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`min-w-[2.5rem] px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        pageNum === pagination.page
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => goToPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  pagination.page >= pagination.totalPages
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>
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
      <CVsPageContent />
    </Suspense>
  );
}