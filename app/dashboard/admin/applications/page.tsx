'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { adminApi } from '@/lib/api';

interface Application {
  id: string;
  jobId: string | null;
  jobTitle: string;
  company: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  recruiterId: string;
  recruiterName: string;
  recruiterEmail: string;
  status: string;
  appliedAt: string;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminApplicationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Get current page from URL, default to 1
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const page = Math.max(1, currentPage); // Ensure page is at least 1
  
  // Filter states - initialize from URL params
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || '');
  const [companyFilter, setCompanyFilter] = useState<string>(searchParams.get('company') || '');
  const [jobTitleFilter, setJobTitleFilter] = useState<string>(searchParams.get('jobTitle') || '');
  const [jobSeekerFilter, setJobSeekerFilter] = useState<string>(searchParams.get('jobSeeker') || '');

  useEffect(() => {
    document.title = 'Applications - Admin Dashboard | Chickenloop';
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'admin') {
      router.push(`/${user.role === 'recruiter' ? 'recruiter' : 'job-seeker'}`);
    }
  }, [user, authLoading, router]);

  // Update URL when filters or page change
  const updateURL = (newPage: number, newFilters: { status?: string; company?: string; jobTitle?: string; jobSeeker?: string }) => {
    const params = new URLSearchParams();
    if (newPage > 1) params.set('page', newPage.toString());
    if (newFilters.status) params.set('status', newFilters.status);
    if (newFilters.company) params.set('company', newFilters.company);
    if (newFilters.jobTitle) params.set('jobTitle', newFilters.jobTitle);
    if (newFilters.jobSeeker) params.set('jobSeeker', newFilters.jobSeeker);
    
    const queryString = params.toString();
    const newUrl = queryString ? `/dashboard/admin/applications?${queryString}` : '/dashboard/admin/applications';
    router.push(newUrl, { scroll: false });
  };

  // Load applications when user is available, filters change, or page changes
  useEffect(() => {
    if (user && user.role === 'admin') {
      loadApplications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, statusFilter, companyFilter, jobTitleFilter, jobSeekerFilter, page]);

  const loadApplications = async () => {
    setLoading(true);
    setError('');
    try {
      const filters: any = {};
      if (statusFilter) filters.status = statusFilter;
      if (companyFilter) filters.company = companyFilter;
      if (jobTitleFilter) filters.jobTitle = jobTitleFilter;
      if (jobSeekerFilter) filters.jobSeeker = jobSeekerFilter;
      filters.page = page; // Always include page
      
      const data = await adminApi.getApplications(filters);
      setApplications(data.applications || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
      
      // Validate page number - if current page is out of range, redirect to page 1
      if (data.totalPages > 0 && page > data.totalPages) {
        updateURL(1, { status: statusFilter, company: companyFilter, jobTitle: jobTitleFilter, jobSeeker: jobSeekerFilter });
      }
    } catch (err: any) {
      console.error('Failed to load applications:', err);
      // Provide user-friendly error messages
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        setError('Your session has expired. Please log in again.');
      } else if (err.message?.includes('403') || err.message?.includes('Forbidden')) {
        setError('You do not have permission to view applications.');
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        setError('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'Unable to load applications. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setStatusFilter('');
    setCompanyFilter('');
    setJobTitleFilter('');
    setJobSeekerFilter('');
    updateURL(1, {}); // Reset to page 1 when clearing filters
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    updateURL(newPage, { status: statusFilter, company: companyFilter, jobTitle: jobTitleFilter, jobSeeker: jobSeekerFilter });
  };

  const handleFilterChange = () => {
    // Reset to page 1 when filters change
    // Use current filter state values
    const currentFilters = {
      status: statusFilter || undefined,
      company: companyFilter || undefined,
      jobTitle: jobTitleFilter || undefined,
      jobSeeker: jobSeekerFilter || undefined,
    };
    updateURL(1, currentFilters);
  };

  const hasActiveFilters = statusFilter || companyFilter || jobTitleFilter || jobSeekerFilter;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'bg-blue-100 text-blue-800';
      case 'viewed':
        return 'bg-purple-100 text-purple-800';
      case 'contacted':
        return 'bg-cyan-100 text-cyan-800';
      case 'interviewing':
        return 'bg-yellow-100 text-yellow-800';
      case 'offered':
        return 'bg-orange-100 text-orange-800';
      case 'hired':
        return 'bg-green-100 text-green-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'withdrawn':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'applied':
        return 'Applied';
      case 'viewed':
        return 'Viewed';
      case 'contacted':
        return 'Contacted';
      case 'interviewing':
        return 'Interviewing';
      case 'offered':
        return 'Offered';
      case 'hired':
        return 'Hired';
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      case 'withdrawn':
        return 'Withdrawn';
      default:
        return status;
    }
  };

  const shortenId = (id: string) => {
    return id.length > 8 ? `${id.substring(0, 8)}...` : id;
  };

  const hasNoResults = !loading && applications.length === 0;
  const hasNoResultsWithFilters = hasNoResults && hasActiveFilters;
  const hasNoResultsNoFilters = hasNoResults && !hasActiveFilters;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-lg text-gray-600">Loading applications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Breadcrumbs
            items={[
              { label: 'Admin Dashboard', href: '/admin' },
              { label: 'Applications' },
            ]}
          />
          
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Applications</h1>
              <p className="text-gray-600 mt-2">Manage and monitor all job applications</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error loading applications</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={loadApplications}
                      className="text-sm font-medium text-red-800 hover:text-red-900 underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear All
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setTimeout(handleFilterChange, 0); // Reset to page 1 after filter change
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">All Statuses</option>
                <option value="applied">Applied</option>
                <option value="viewed">Viewed</option>
                <option value="contacted">Contacted</option>
                <option value="interviewing">Interviewing</option>
                <option value="offered">Offered</option>
                <option value="hired">Hired</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>

            {/* Company Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company
              </label>
              <input
                type="text"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                onBlur={handleFilterChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFilterChange();
                  }
                }}
                placeholder="Search company..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            {/* Job Title Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={jobTitleFilter}
                onChange={(e) => setJobTitleFilter(e.target.value)}
                onBlur={handleFilterChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFilterChange();
                  }
                }}
                placeholder="Search job title..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            {/* Job Seeker Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Seeker
              </label>
              <input
                type="text"
                value={jobSeekerFilter}
                onChange={(e) => setJobSeekerFilter(e.target.value)}
                onBlur={handleFilterChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFilterChange();
                  }
                }}
                placeholder="Name or email..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">All Applications</h2>
            {!hasNoResults && (
              <p className="text-sm text-gray-600 mt-1">
                Showing {applications.length > 0 ? ((page - 1) * 20 + 1) : 0} to {Math.min(page * 20, totalCount)} of {totalCount} {totalCount === 1 ? 'entry' : 'entries'}
              </p>
            )}
          </div>

          {hasNoResultsNoFilters ? (
            <div className="p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                There are no applications in the system at this time. Applications will appear here once job seekers start applying to jobs.
              </p>
            </div>
          ) : hasNoResultsWithFilters ? (
            <div className="p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No applications match your filters</h3>
              <p className="text-gray-600 max-w-md mx-auto mb-4">
                Try adjusting your search criteria or clearing the filters to see more results.
              </p>
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Application ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Job Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Job Seeker
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date Applied
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Updated
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {applications.map((application) => (
                      <tr key={application.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                          {shortenId(application.id)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {application.jobTitle}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {application.company}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{application.candidateName}</span>
                            <span className="text-xs text-gray-400">{application.candidateEmail}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(application.status)}`}>
                            {getStatusLabel(application.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(application.appliedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(application.lastActivityAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            href={`/dashboard/admin/applications/${application.id}`}
                            className="text-blue-600 hover:text-blue-900 hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                        className={`px-4 py-2 rounded-md font-medium transition-colors ${
                          page === 1
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                        }`}
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                        className={`px-4 py-2 rounded-md font-medium transition-colors ${
                          page === totalPages
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                  {/* Page numbers */}
                  {totalPages <= 10 && (
                    <div className="flex justify-center gap-1 mt-4">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                            pageNum === page
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
