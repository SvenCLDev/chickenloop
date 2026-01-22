'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { adminApi } from '@/lib/api';

interface Statistics {
  jobSeekers: number;
  recruiters: number;
  jobs: number;
  cvs: number;
  companies: number;
  applications: number;
}

type CategoryType = 'job-seekers' | 'recruiters' | 'jobs' | 'cvs' | 'companies' | null;

// Helper function to format time ago
function getTimeAgo(date: string | undefined | null): string {
  if (!date) return '—';
  
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

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt?: string;
  lastOnline?: string;
  jobs?: any[];
  cv?: any;
  companyName?: string | null;
  lastActive?: string | null;
  jobCount?: number;
}

interface Job {
  id: string;
  title: string;
  company: string;
  city: string;
  type: string;
  recruiter: any;
  featured?: boolean;
  createdAt: string;
}

interface CV {
  id: string;
  jobSeeker: any;
  published: boolean;
  createdAt: string;
}

interface Company {
  id: string;
  name: string;
  address?: {
    city?: string;
    state?: string;
    country?: string;
  };
  website?: string;
  featured?: boolean;
  owner: any;
  createdAt: string;
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [togglingFeatured, setTogglingFeatured] = useState<string | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<string | null>(null);
  const [deletingJob, setDeletingJob] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('lastActive');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [emailFilter, setEmailFilter] = useState<string>('');
  const [debouncedEmailFilter, setDebouncedEmailFilter] = useState<string>('');
  const entriesPerPage = 20;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'admin') {
      router.push(`/${user.role === 'recruiter' ? 'recruiter' : 'job-seeker'}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadStatistics();
      setLoading(false);
    }
  }, [user]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Debounce email filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEmailFilter(emailFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [emailFilter]);

  // Refetch job-seekers data when sort, search, or email filter changes
  useEffect(() => {
    if (selectedCategory === 'job-seekers') {
      loadCategoryData('job-seekers');
    }
  }, [sortColumn, sortDirection, debouncedSearchQuery, debouncedEmailFilter]);

  // Refetch recruiters data when sort, search, or email filter changes
  useEffect(() => {
    if (selectedCategory === 'recruiters') {
      loadCategoryData('recruiters');
    }
  }, [sortColumn, sortDirection, debouncedSearchQuery, debouncedEmailFilter]);

  const loadStatistics = async () => {
    try {
      const data = await adminApi.getStatistics();
      setStatistics(data.statistics);
    } catch (err: any) {
      console.error('Failed to load statistics:', err);
      // Don't show error for statistics, just log it
    }
  };

  const loadCategoryData = async (category: CategoryType) => {
    if (!category) return;
    
    setTableLoading(true);
    setCurrentPage(1);
    
    try {
      let data: any;
      
      switch (category) {
        case 'job-seekers':
          // Map UI column names to API sortBy values
          const sortByMap: Record<string, string> = {
            'name': 'name',
            'email': 'email',
            'lastActive': 'lastActive',
            'hasCV': 'hasCV',
            'availability': 'availability',
          };
          const apiSortBy = sortByMap[sortColumn] || 'lastActive';
          
          const usersData = await adminApi.getUsers({
            search: debouncedSearchQuery.trim() || undefined,
            email: debouncedEmailFilter.trim() || undefined,
            sortBy: apiSortBy,
            sortOrder: sortDirection,
          });
          data = usersData.users.filter((u: User) => u.role === 'job-seeker');
          break;
        case 'recruiters':
          // Map UI column names to API sortBy values
          const recruiterSortByMap: Record<string, string> = {
            'name': 'name',
            'email': 'email',
            'companyName': 'companyName',
            'lastActive': 'lastActive',
            'jobCount': 'jobCount',
          };
          const recruiterApiSortBy = recruiterSortByMap[sortColumn] || 'lastActive';
          
          const recruitersData = await adminApi.getUsers({
            search: debouncedSearchQuery.trim() || undefined,
            email: debouncedEmailFilter.trim() || undefined,
            sortBy: recruiterApiSortBy,
            sortOrder: sortDirection,
          });
          data = recruitersData.users.filter((u: User) => u.role === 'recruiter');
          break;
        case 'jobs':
          const jobsData = await adminApi.getJobs();
          data = jobsData.jobs || [];
          break;
        case 'cvs':
          const cvsData = await adminApi.getCVs();
          data = cvsData.cvs || [];
          break;
        case 'companies':
          const companiesData = await adminApi.getCompanies();
          data = companiesData.companies || [];
          break;
        default:
          data = [];
      }
      
      setTableData(data);
    } catch (err: any) {
      console.error(`Failed to load ${category}:`, err);
      setTableData([]);
    } finally {
      setTableLoading(false);
    }
  };

  const handleCardClick = (category: CategoryType) => {
    if (selectedCategory === category) {
      // If clicking the same card, close the table
      setSelectedCategory(null);
      setTableData([]);
      setSearchQuery('');
      setEmailFilter('');
    } else {
      // Open new category
      setSelectedCategory(category);
      // Reset search query and email filter when switching categories
      setSearchQuery('');
      setEmailFilter('');
      loadCategoryData(category);
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(tableData.length / entriesPerPage);
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = tableData.slice(indexOfFirstEntry, indexOfLastEntry);

  const handleToggleFeatured = async (companyId: string, currentFeatured: boolean) => {
    if (togglingFeatured === companyId) {
      console.log(`[Admin] Already toggling featured for company ${companyId}, ignoring duplicate click`);
      return;
    }
    
    const newFeaturedStatus = !currentFeatured;
    console.log(`[Admin] Toggling featured for company ${companyId} from ${currentFeatured} to ${newFeaturedStatus}`);
    
    setTogglingFeatured(companyId);
    
    // Optimistically update the UI immediately
    setTableData(prevData => prevData.map((c) => 
      c.id === companyId ? { ...c, featured: newFeaturedStatus } : c
    ));
    
    try {
      console.log(`[Admin] Calling API to update company ${companyId} with featured: ${newFeaturedStatus}`);
      const response = await adminApi.updateCompany(companyId, { featured: newFeaturedStatus });
      console.log(`[Admin] API response:`, JSON.stringify(response, null, 2));
      
      // Check if the response contains the updated company with the correct featured status
      if (response && response.company) {
        const updatedFeatured = response.company.featured === true; // Explicitly check for true
        console.log(`[Admin] API returned featured status: ${updatedFeatured}, expected: ${newFeaturedStatus}`);
        
        if (updatedFeatured !== newFeaturedStatus) {
          console.error(`[Admin] Featured status mismatch! API returned ${updatedFeatured} but expected ${newFeaturedStatus}`);
          // Use the API response value if it's different
          setTableData(prevData => prevData.map((c) => 
            c.id === companyId ? { ...c, featured: updatedFeatured } : c
          ));
        } else {
          // Update state with the confirmed value from API
          setTableData(prevData => prevData.map((c) => 
            c.id === companyId ? { ...c, featured: updatedFeatured } : c
          ));
        }
      } else {
        console.warn(`[Admin] API response doesn't contain company data, reloading companies list...`);
        // If response doesn't have company data, reload the list
        if (selectedCategory === 'companies') {
          await loadCategoryData('companies');
        }
      }
      
      console.log(`[Admin] Featured status updated successfully`);
    } catch (err: any) {
      console.error('[Admin] Error updating featured status:', err);
      // Revert optimistic update on error
      setTableData(prevData => prevData.map((c) => 
        c.id === companyId ? { ...c, featured: currentFeatured } : c
      ));
    } finally {
      setTogglingFeatured(null);
    }
  };

  const handleToggleJobFeatured = async (jobId: string, currentFeatured: boolean) => {
    if (togglingFeatured === jobId) {
      console.log(`[Admin] Already toggling featured for job ${jobId}, ignoring duplicate click`);
      return;
    }
    
    const newFeaturedStatus = !currentFeatured;
    
    // Optimistic update
    setTableData(prevData => prevData.map((j) => 
      j.id === jobId ? { ...j, featured: newFeaturedStatus } : j
    ));
    setTogglingFeatured(jobId);
    
    try {
      await adminApi.updateJob(jobId, { featured: newFeaturedStatus });
      console.log(`[Admin] Job ${jobId} featured status updated to ${newFeaturedStatus}`);
      
      // If response doesn't have job data, reload the list
      if (selectedCategory === 'jobs') {
        await loadCategoryData('jobs');
      }
    } catch (err: any) {
      console.error('[Admin] Error updating job featured status:', err);
      // Revert optimistic update on error
      setTableData(prevData => prevData.map((j) => 
        j.id === jobId ? { ...j, featured: currentFeatured } : j
      ));
      alert(`Failed to update featured status: ${err.message || 'Unknown error'}`);
    } finally {
      setTogglingFeatured(null);
    }
  };

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    if (!confirm(`Are you sure you want to delete "${companyName}"? This action cannot be undone and will also delete all associated jobs.`)) {
      return;
    }

    setDeletingCompany(companyId);
    
    try {
      await adminApi.deleteCompany(companyId);
      // Remove the company from the table
      setTableData(prevData => prevData.filter((c) => c.id !== companyId));
      // Reload statistics to update the count
      await loadStatistics();
    } catch (err: any) {
      console.error('[Admin] Error deleting company:', err);
      alert(`Failed to delete company: ${err.message || 'Unknown error'}`);
    } finally {
      setDeletingCompany(null);
    }
  };

  const handleEditCompany = (companyId: string) => {
    // Navigate to company edit page - for now use admin companies detail/edit
    router.push(`/admin/companies/${companyId}/edit`);
  };

  const handleDeleteJob = async (jobId: string, jobTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${jobTitle}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingJob(jobId);
    
    try {
      await adminApi.deleteJob(jobId);
      // Remove the job from the table
      setTableData(prevData => prevData.filter((j) => j.id !== jobId));
      // Reload statistics to update the count
      await loadStatistics();
    } catch (err: any) {
      console.error('[Admin] Error deleting job:', err);
      alert(`Failed to delete job: ${err.message || 'Unknown error'}`);
    } finally {
      setDeletingJob(null);
    }
  };

  const handleEditJob = (jobId: string) => {
    // Navigate to admin job edit page
    router.push(`/admin/jobs/${jobId}/edit`);
  };

  const handleEditUser = (userId: string) => {
    // Navigate to admin user edit page (if exists) or show user details
    // For now, navigate to a user detail/edit page
    router.push(`/admin/users/${userId}/edit`);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column: reset to ASC
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIndicator = (column: string) => {
    if (sortColumn !== column) {
      return null; // No indicator for inactive columns
    }
    return sortDirection === 'asc' ? '▲' : '▼';
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
          <Link
            href="/admin/career-advice"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Manage Career Advice
          </Link>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
            {/* Job Seekers Card */}
            <button
              onClick={() => handleCardClick('job-seekers')}
              className={`bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500 text-left transition-all hover:shadow-lg cursor-pointer ${
                selectedCategory === 'job-seekers' ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Job Seekers</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{statistics.jobSeekers}</p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Recruiters Card */}
            <button
              onClick={() => handleCardClick('recruiters')}
              className={`bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500 text-left transition-all hover:shadow-lg cursor-pointer ${
                selectedCategory === 'recruiters' ? 'ring-2 ring-green-500' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Recruiters</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{statistics.recruiters}</p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Jobs Card */}
            <button
              onClick={() => handleCardClick('jobs')}
              className={`bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500 text-left transition-all hover:shadow-lg cursor-pointer ${
                selectedCategory === 'jobs' ? 'ring-2 ring-purple-500' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Jobs</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{statistics.jobs}</p>
                </div>
                <div className="bg-purple-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </button>

            {/* CVs Card */}
            <button
              onClick={() => handleCardClick('cvs')}
              className={`bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500 text-left transition-all hover:shadow-lg cursor-pointer ${
                selectedCategory === 'cvs' ? 'ring-2 ring-orange-500' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">CVs</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{statistics.cvs}</p>
                </div>
                <div className="bg-orange-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Companies Card */}
            <button
              onClick={() => handleCardClick('companies')}
              className={`bg-white rounded-lg shadow-md p-6 border-l-4 border-indigo-500 text-left transition-all hover:shadow-lg cursor-pointer ${
                selectedCategory === 'companies' ? 'ring-2 ring-indigo-500' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Companies</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{statistics.companies}</p>
                </div>
                <div className="bg-indigo-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Applications Card */}
            <Link
              href="/dashboard/admin/applications"
              className="bg-white rounded-lg shadow-md p-6 border-l-4 border-teal-500 text-left transition-all hover:shadow-lg cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Applications</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{statistics.applications}</p>
                </div>
                <div className="bg-teal-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Data Table */}
        {selectedCategory && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mt-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 capitalize">
                {selectedCategory === 'job-seekers' ? 'Job Seekers' : 
                 selectedCategory === 'recruiters' ? 'Recruiters' :
                 selectedCategory === 'jobs' ? 'Jobs' : 
                 selectedCategory === 'cvs' ? 'CVs' : 'Companies'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Showing {indexOfFirstEntry + 1} to {Math.min(indexOfLastEntry, tableData.length)} of {tableData.length} entries
              </p>
            </div>

            {/* Search and email filter inputs for job-seekers */}
            {selectedCategory === 'job-seekers' && (
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search candidates…"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                  <div>
                    <input
                      id="email-filter"
                      type="text"
                      value={emailFilter}
                      onChange={(e) => setEmailFilter(e.target.value)}
                      placeholder="Filter by email"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Search and email filter inputs for recruiters */}
            {selectedCategory === 'recruiters' && (
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search recruiters…"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                  <div>
                    <input
                      id="recruiter-email-filter"
                      type="text"
                      value={emailFilter}
                      onChange={(e) => setEmailFilter(e.target.value)}
                      placeholder="Filter by email"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {tableLoading ? (
              <div className="p-8 text-center">
                <p className="text-gray-600">Loading...</p>
              </div>
            ) : currentEntries.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-600">No data available</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {selectedCategory === 'job-seekers' ? (
                          <>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('name')}
                            >
                              <div className="flex items-center gap-1">
                                Name
                                {getSortIndicator('name') && (
                                  <span className="text-gray-400">{getSortIndicator('name')}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('email')}
                            >
                              <div className="flex items-center gap-1">
                                Email
                                {getSortIndicator('email') && (
                                  <span className="text-gray-400">{getSortIndicator('email')}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('lastActive')}
                            >
                              <div className="flex items-center gap-1">
                                Last active
                                {getSortIndicator('lastActive') && (
                                  <span className="text-gray-400">{getSortIndicator('lastActive')}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('hasCV')}
                            >
                              <div className="flex items-center gap-1">
                                Has CV
                                {getSortIndicator('hasCV') && (
                                  <span className="text-gray-400">{getSortIndicator('hasCV')}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('availability')}
                            >
                              <div className="flex items-center gap-1">
                                Availability
                                {getSortIndicator('availability') && (
                                  <span className="text-gray-400">{getSortIndicator('availability')}</span>
                                )}
                              </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </>
                        ) : selectedCategory === 'recruiters' ? (
                          <>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('name')}
                            >
                              <div className="flex items-center gap-1">
                                Name
                                {getSortIndicator('name') && (
                                  <span className="text-gray-400">{getSortIndicator('name')}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('email')}
                            >
                              <div className="flex items-center gap-1">
                                Email
                                {getSortIndicator('email') && (
                                  <span className="text-gray-400">{getSortIndicator('email')}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('companyName')}
                            >
                              <div className="flex items-center gap-1">
                                Company
                                {getSortIndicator('companyName') && (
                                  <span className="text-gray-400">{getSortIndicator('companyName')}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('lastActive')}
                            >
                              <div className="flex items-center gap-1">
                                Last active
                                {getSortIndicator('lastActive') && (
                                  <span className="text-gray-400">{getSortIndicator('lastActive')}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('jobCount')}
                            >
                              <div className="flex items-center gap-1">
                                Number of jobs
                                {getSortIndicator('jobCount') && (
                                  <span className="text-gray-400">{getSortIndicator('jobCount')}</span>
                                )}
                              </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </>
                        ) : selectedCategory === 'jobs' ? (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recruiter</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Featured</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </>
                        ) : selectedCategory === 'cvs' ? (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Seeker</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Published</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                          </>
                        ) : (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Website</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Featured</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentEntries.map((entry: any) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          {selectedCategory === 'job-seekers' ? (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.email}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {getTimeAgo(entry.lastOnline || entry.updatedAt)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {entry.cv ? (
                                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                    Yes
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                    No
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {entry.cv?.availability ? (
                                  <span className="capitalize">{entry.cv.availability.replace(/-/g, ' ')}</span>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => handleEditUser(entry.id)}
                                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
                                  title="Edit user"
                                >
                                  Edit
                                </button>
                              </td>
                            </>
                          ) : selectedCategory === 'recruiters' ? (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.email}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {entry.companyName || '—'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {getTimeAgo(entry.lastActive)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {entry.jobCount ?? 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => handleEditUser(entry.id)}
                                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
                                  title="Edit recruiter"
                                >
                                  Edit
                                </button>
                              </td>
                            </>
                          ) : selectedCategory === 'jobs' ? (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.title}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.company}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.city}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.type}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {entry.recruiter?.name || 'Unknown'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <button
                                  onClick={() => handleToggleJobFeatured(entry.id, entry.featured || false)}
                                  disabled={togglingFeatured === entry.id}
                                  className={`px-3 py-1 rounded-md text-xs font-medium ${
                                    entry.featured
                                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  } ${togglingFeatured === entry.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  title={entry.featured ? 'Click to unfeature' : 'Click to feature'}
                                >
                                  {togglingFeatured === entry.id ? 'Updating...' : (entry.featured ? '⭐ Featured' : 'Not Featured')}
                                </button>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(entry.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleEditJob(entry.id)}
                                    className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
                                    title="Edit job"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteJob(entry.id, entry.title)}
                                    disabled={deletingJob === entry.id}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                      deletingJob === entry.id
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-red-600 text-white hover:bg-red-700'
                                    }`}
                                    title="Delete job"
                                  >
                                    {deletingJob === entry.id ? 'Deleting...' : 'Delete'}
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : selectedCategory === 'cvs' ? (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {entry.jobSeeker?.name || 'Unknown'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {entry.jobSeeker?.email || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  entry.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {entry.published ? 'Published' : 'Draft'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(entry.createdAt).toLocaleDateString()}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {entry.address 
                                  ? `${entry.address.city || ''}${entry.address.city && entry.address.state ? ', ' : ''}${entry.address.state || ''}${entry.address.country ? `, ${entry.address.country}` : ''}`.trim() || 'N/A'
                                  : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {entry.website ? (
                                  <a href={entry.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    {entry.website}
                                  </a>
                                ) : (
                                  'N/A'
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {entry.owner?.name ? `${entry.owner.name} (${entry.owner.email})` : 'Unknown'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <button
                                  onClick={() => handleToggleFeatured(entry.id, entry.featured || false)}
                                  disabled={togglingFeatured === entry.id}
                                  className={`px-3 py-1 rounded-md text-xs font-medium ${
                                    entry.featured
                                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  } ${togglingFeatured === entry.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  title={entry.featured ? 'Click to unfeature' : 'Click to feature'}
                                >
                                  {togglingFeatured === entry.id ? 'Updating...' : (entry.featured ? '⭐ Featured' : 'Not Featured')}
                                </button>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(entry.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleEditCompany(entry.id)}
                                    className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
                                    title="Edit company"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCompany(entry.id, entry.name)}
                                    disabled={deletingCompany === entry.id}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                      deletingCompany === entry.id
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-red-600 text-white hover:bg-red-700'
                                    }`}
                                    title="Delete company"
                                  >
                                    {deletingCompany === entry.id ? 'Deleting...' : 'Delete'}
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className={`px-4 py-2 rounded-md font-medium ${
                          currentPage === 1
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className={`px-4 py-2 rounded-md font-medium ${
                          currentPage === totalPages
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

