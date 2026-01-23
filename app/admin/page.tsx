'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
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
  careerAdvice: number;
}

type CategoryType = 'job-seekers' | 'recruiters' | 'jobs' | 'cvs' | 'companies' | 'applications' | 'career-advice' | null;

// Helper functions for applications status
function getStatusColor(status: string) {
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
}

function getStatusLabel(status: string) {
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
}

function shortenId(id: string) {
  return id.length > 8 ? `${id.substring(0, 8)}...` : id;
}

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

function AdminDashboard() {
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
  
  // Applications-specific state
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [companyFilter, setCompanyFilter] = useState<string>('');
  const [jobSeekerFilter, setJobSeekerFilter] = useState<string>('');
  const [applicationsTotalCount, setApplicationsTotalCount] = useState(0);
  const [applicationsTotalPages, setApplicationsTotalPages] = useState(1);
  
  // Track if section query param has been processed
  const sectionProcessedRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'admin') {
      router.push(`/${user.role === 'recruiter' ? 'recruiter' : 'job-seeker'}`);
    }
  }, [user, authLoading, router]);

  const searchParams = useSearchParams();

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadStatistics();
      setLoading(false);
    }
  }, [user]);

  // Handle section query parameter separately after component mounts
  useEffect(() => {
    if (user && user.role === 'admin' && !loading && statistics && !sectionProcessedRef.current) {
      const section = searchParams.get('section');
      if (section && ['job-seekers', 'recruiters', 'jobs', 'cvs', 'companies', 'applications', 'career-advice'].includes(section)) {
        sectionProcessedRef.current = true;
        setSelectedCategory(section as CategoryType);
        loadCategoryData(section as CategoryType);
      }
    }
  }, [user, searchParams, loading, statistics]);

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

  // Refetch CVs data when sort or search changes
  useEffect(() => {
    if (selectedCategory === 'cvs') {
      loadCategoryData('cvs');
    }
  }, [sortColumn, sortDirection, debouncedSearchQuery]);

  // Refetch companies data when search or sort changes
  useEffect(() => {
    if (selectedCategory === 'companies') {
      loadCategoryData('companies');
    }
  }, [debouncedSearchQuery, sortColumn, sortDirection]);

  // Refetch jobs data when search or sort changes
  useEffect(() => {
    if (selectedCategory === 'jobs') {
      loadCategoryData('jobs');
    }
  }, [debouncedSearchQuery, sortColumn, sortDirection]);

  // Refetch career advice data when search or sort changes
  useEffect(() => {
    if (selectedCategory === 'career-advice') {
      loadCategoryData('career-advice');
    }
  }, [debouncedSearchQuery, sortColumn, sortDirection]);

  // Refetch applications data when category, filters, sort, or page changes
  useEffect(() => {
    if (selectedCategory === 'applications') {
      loadCategoryData('applications');
    }
  }, [selectedCategory, statusFilter, companyFilter, jobSeekerFilter, sortColumn, sortDirection, currentPage]);

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
          // Map UI column names to API sortBy values
          const jobSortByMap: Record<string, string> = {
            'title': 'title',
            'location': 'location',
            'recruiter': 'recruiter',
            'featured': 'featured',
            'created': 'created',
          };
          const jobApiSortBy = jobSortByMap[sortColumn] || 'created';
          
          const jobsData = await adminApi.getJobs({
            search: debouncedSearchQuery.trim() || undefined,
            sortBy: jobApiSortBy,
            sortOrder: sortDirection,
          });
          data = jobsData.jobs || [];
          break;
        case 'cvs':
          // Map UI column names to API sortBy values
          const cvSortByMap: Record<string, string> = {
            'jobSeeker': 'jobSeeker',
            'email': 'email',
            'published': 'published',
            'created': 'created',
          };
          const cvApiSortBy = cvSortByMap[sortColumn] || 'created';
          
          const cvsData = await adminApi.getCVs({
            search: debouncedSearchQuery.trim() || undefined,
            sortBy: cvApiSortBy,
            sortOrder: sortDirection,
          });
          data = cvsData.cvs || [];
          break;
        case 'companies':
          // Map UI column names to API sortBy values
          const companySortByMap: Record<string, string> = {
            'name': 'name',
            'featured': 'featured',
            'created': 'created',
          };
          const companyApiSortBy = companySortByMap[sortColumn] || 'created';
          
          const companiesData = await adminApi.getCompanies({
            search: debouncedSearchQuery.trim() || undefined,
            sortBy: companyApiSortBy,
            sortOrder: sortDirection,
          });
          data = companiesData.companies || [];
          break;
        case 'applications':
          const applicationsFilters: any = {};
          if (statusFilter) applicationsFilters.status = statusFilter;
          if (companyFilter) applicationsFilters.company = companyFilter;
          if (jobSeekerFilter) applicationsFilters.jobSeeker = jobSeekerFilter;
          applicationsFilters.page = currentPage;
          
          // Map UI sort keys to API sortBy values
          const applicationsSortByMap: Record<string, string> = {
            'jobTitle': 'jobTitle',
            'company': 'company',
            'jobSeeker': 'jobSeeker',
            'status': 'status',
            'applied': 'applied',
            'updated': 'updated',
          };
          const applicationsApiSortBy = applicationsSortByMap[sortColumn] || 'applied';
          applicationsFilters.sortBy = applicationsApiSortBy;
          applicationsFilters.sortOrder = sortDirection;
          
          const applicationsData = await adminApi.getApplications(applicationsFilters);
          data = applicationsData.applications || [];
          setApplicationsTotalCount(applicationsData.totalCount || 0);
          setApplicationsTotalPages(applicationsData.totalPages || 1);
          break;
        case 'career-advice':
          const careerAdviceSortByMap: Record<string, string> = {
            'title': 'title',
            'author': 'author',
            'created': 'created',
          };
          const careerAdviceApiSortBy = careerAdviceSortByMap[sortColumn] || 'created';
          const careerAdviceData = await adminApi.getCareerAdvice({
            search: debouncedSearchQuery.trim() || undefined,
            sortBy: careerAdviceApiSortBy,
            sortOrder: sortDirection,
          });
          data = careerAdviceData.articles || [];
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
      // Reset applications filters
      setStatusFilter('');
      setCompanyFilter('');
      setJobSeekerFilter('');
    } else {
      // Open new category
      setSelectedCategory(category);
      // Reset search query and email filter when switching categories
      setSearchQuery('');
      setEmailFilter('');
      // Reset applications filters when switching away from applications
      if (category !== 'applications') {
        setStatusFilter('');
        setCompanyFilter('');
        setJobSeekerFilter('');
      }
      // Set default sort based on category
      if (category === 'cvs') {
        setSortColumn('created');
        setSortDirection('desc');
      } else if (category === 'job-seekers' || category === 'recruiters') {
        setSortColumn('lastActive');
        setSortDirection('desc');
      } else if (category === 'companies' || category === 'jobs') {
        setSortColumn('created');
        setSortDirection('desc');
      } else if (category === 'applications') {
        setSortColumn('applied');
        setSortDirection('desc');
      } else if (category === 'career-advice') {
        setSortColumn('created');
        setSortDirection('desc');
      }
      setCurrentPage(1); // Reset to page 1 when switching categories
      loadCategoryData(category);
    }
  };

  // Calculate pagination
  // For applications, use server-side pagination; for others, use client-side
  const totalPages = selectedCategory === 'applications' 
    ? applicationsTotalPages 
    : Math.ceil(tableData.length / entriesPerPage);
  const indexOfLastEntry = selectedCategory === 'applications'
    ? Math.min(currentPage * 20, applicationsTotalCount)
    : currentPage * entriesPerPage;
  const indexOfFirstEntry = selectedCategory === 'applications'
    ? applicationsTotalCount > 0 ? ((currentPage - 1) * 20 + 1) : 0
    : indexOfLastEntry - entriesPerPage;
  const currentEntries = selectedCategory === 'applications'
    ? tableData // Applications data is already paginated from server
    : tableData.slice(indexOfFirstEntry, indexOfLastEntry);

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

  const handleEditCV = (cvId: string) => {
    // Navigate to admin CV edit page
    router.push(`/admin/cvs/${cvId}/edit`);
  };

  const handleEditCareerAdvice = (articleId: string) => {
    // Navigate to admin career advice edit page
    router.push(`/admin/career-advice/${articleId}/edit`);
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-6 mb-8">
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
            <button
              onClick={() => handleCardClick('applications')}
              className={`bg-white rounded-lg shadow-md p-6 border-l-4 border-teal-500 text-left transition-all hover:shadow-lg cursor-pointer ${
                selectedCategory === 'applications' ? 'ring-2 ring-teal-500' : ''
              }`}
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
            </button>

            {/* Career Advice Card */}
            <button
              onClick={() => handleCardClick('career-advice')}
              className={`bg-white rounded-lg shadow-md p-6 border-l-4 border-pink-500 text-left transition-all hover:shadow-lg cursor-pointer ${
                selectedCategory === 'career-advice' ? 'ring-2 ring-pink-500' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Career Advice</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{statistics.careerAdvice}</p>
                </div>
                <div className="bg-pink-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              </div>
            </button>
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
                 selectedCategory === 'cvs' ? 'CVs' : 
                 selectedCategory === 'companies' ? 'Companies' :
                 selectedCategory === 'applications' ? 'Applications' :
                 selectedCategory === 'career-advice' ? 'Career Advice' : ''}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {selectedCategory === 'career-advice' ? (
                  'Manage career advice articles and content'
                ) : selectedCategory === 'applications' ? (
                  applicationsTotalCount > 0 
                    ? `Showing ${indexOfFirstEntry} to ${indexOfLastEntry} of ${applicationsTotalCount} ${applicationsTotalCount === 1 ? 'entry' : 'entries'}`
                    : 'No entries'
                ) : (
                  `Showing ${indexOfFirstEntry + 1} to ${Math.min(indexOfLastEntry, tableData.length)} of ${tableData.length} entries`
                )}
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

            {/* Search input for CVs */}
            {selectedCategory === 'cvs' && (
              <div className="px-6 py-4 border-b border-gray-200">
                <div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search CVs by name or email…"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>
            )}

            {/* Search input for Companies */}
            {selectedCategory === 'companies' && (
              <div className="px-6 py-4 border-b border-gray-200">
                <div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search companies by name, location, website, or owner…"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>
            )}

            {/* Search input for Jobs */}
            {selectedCategory === 'jobs' && (
              <div className="px-6 py-4 border-b border-gray-200">
                <div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search jobs by title, location, or recruiter…"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>
            )}

            {/* Search input for Career Advice */}
            {selectedCategory === 'career-advice' && (
              <div className="px-6 py-4 border-b border-gray-200">
                <div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search articles by title or author…"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>
            )}

            {/* Filters for Applications */}
            {selectedCategory === 'applications' && (
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
                  {(statusFilter || companyFilter || jobSeekerFilter) && (
                    <button
                      onClick={() => {
                        setStatusFilter('');
                        setCompanyFilter('');
                        setJobSeekerFilter('');
                        setCurrentPage(1);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setCurrentPage(1);
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company
                    </label>
                    <input
                      type="text"
                      value={companyFilter}
                      onChange={(e) => setCompanyFilter(e.target.value)}
                      onBlur={() => setCurrentPage(1)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setCurrentPage(1);
                        }
                      }}
                      placeholder="Search company..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Seeker
                    </label>
                    <input
                      type="text"
                      value={jobSeekerFilter}
                      onChange={(e) => setJobSeekerFilter(e.target.value)}
                      onBlur={() => setCurrentPage(1)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setCurrentPage(1);
                        }
                      }}
                      placeholder="Name or email..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                  <table className="min-w-full divide-y divide-gray-200 table-fixed">
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
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none w-0"
                              style={{ maxWidth: '400px', width: '30%' }}
                              onClick={() => handleSort('title')}
                            >
                              <div className="flex items-center gap-1">
                                Title
                                {getSortIndicator('title') && (
                                  <span className="text-gray-400">{getSortIndicator('title')}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('location')}
                            >
                              <div className="flex items-center gap-1">
                                Location
                                {getSortIndicator('location') && (
                                  <span className="text-gray-400">{getSortIndicator('location')}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('recruiter')}
                            >
                              <div className="flex items-center gap-1">
                                Recruiter
                                {getSortIndicator('recruiter') && (
                                  <span className="text-gray-400">{getSortIndicator('recruiter')}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('featured')}
                            >
                              <div className="flex items-center gap-1">
                                Featured
                                {getSortIndicator('featured') && (
                                  <span className="text-gray-400">{getSortIndicator('featured')}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('created')}
                            >
                              <div className="flex items-center gap-1">
                                Created
                                {getSortIndicator('created') && (
                                  <span className="text-gray-400">{getSortIndicator('created')}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              style={{ width: '160px', minWidth: '160px' }}
                            >
                              Actions
                            </th>
                          </>
                        ) : selectedCategory === 'cvs' ? (
                          <>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('jobSeeker')}
                            >
                              <div className="flex items-center gap-1">
                                Job Seeker
                                {getSortIndicator('jobSeeker') && (
                                  <span className="text-gray-400">{getSortIndicator('jobSeeker')}</span>
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
                              onClick={() => handleSort('published')}
                            >
                              <div className="flex items-center gap-1">
                                Published
                                {getSortIndicator('published') && (
                                  <span className="text-gray-400">{getSortIndicator('published')}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('created')}
                            >
                              <div className="flex items-center gap-1">
                                Created
                                {getSortIndicator('created') && (
                                  <span className="text-gray-400">{getSortIndicator('created')}</span>
                                )}
                              </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </>
                        ) : selectedCategory === 'applications' ? (
                          <>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('jobTitle')}
                            >
                              <div className="flex items-center gap-1">
                                Job Title
                                {getSortIndicator('jobTitle') && (
                                  <span className="text-gray-400">{getSortIndicator('jobTitle')}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('company')}
                            >
                              <div className="flex items-center gap-1">
                                Company
                                {getSortIndicator('company') && (
                                  <span className="text-gray-400">{getSortIndicator('company')}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('jobSeeker')}
                            >
                              <div className="flex items-center gap-1">
                                Job Seeker
                                {getSortIndicator('jobSeeker') && (
                                  <span className="text-gray-400">{getSortIndicator('jobSeeker')}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('status')}
                            >
                              <div className="flex items-center gap-1">
                                Status
                                {getSortIndicator('status') && (
                                  <span className="text-gray-400">{getSortIndicator('status')}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('applied')}
                            >
                              <div className="flex items-center gap-1">
                                Date Applied
                                {getSortIndicator('applied') && (
                                  <span className="text-gray-400">{getSortIndicator('applied')}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('updated')}
                            >
                              <div className="flex items-center gap-1">
                                Last Updated
                                {getSortIndicator('updated') && (
                                  <span className="text-gray-400">{getSortIndicator('updated')}</span>
                                )}
                              </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </>
                        ) : selectedCategory === 'career-advice' ? (
                          <>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('title')}
                            >
                              <div className="flex items-center gap-1">
                                Title
                                {getSortIndicator('title') && (
                                  <span className="text-gray-400">{getSortIndicator('title')}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('author')}
                            >
                              <div className="flex items-center gap-1">
                                Author
                                {getSortIndicator('author') && (
                                  <span className="text-gray-400">{getSortIndicator('author')}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('created')}
                            >
                              <div className="flex items-center gap-1">
                                Created
                                {getSortIndicator('created') && (
                                  <span className="text-gray-400">{getSortIndicator('created')}</span>
                                )}
                              </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </>
                        ) : (
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('featured')}
                            >
                              <div className="flex items-center gap-1">
                                Featured
                                {getSortIndicator('featured') && (
                                  <span className="text-gray-400">{getSortIndicator('featured')}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('created')}
                            >
                              <div className="flex items-center gap-1">
                                Created
                                {getSortIndicator('created') && (
                                  <span className="text-gray-400">{getSortIndicator('created')}</span>
                                )}
                              </div>
                            </th>
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
                              <td className="px-6 py-4 text-sm font-medium text-gray-900" style={{ maxWidth: '400px' }}>
                                <div className="truncate" title={entry.title}>{entry.title}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.city}</td>
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ width: '160px', minWidth: '160px' }}>
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => handleEditCV(entry.id)}
                                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
                                  title="Edit CV"
                                >
                                  Edit
                                </button>
                              </td>
                            </>
                          ) : selectedCategory === 'companies' ? (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {entry.address 
                                  ? `${entry.address.city || ''}${entry.address.city && entry.address.state ? ', ' : ''}${entry.address.state || ''}${entry.address.country ? `, ${entry.address.country}` : ''}`.trim() || 'N/A'
                                  : 'N/A'}
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
                          ) : selectedCategory === 'applications' ? (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {entry.jobTitle || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {entry.company || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-900">{entry.candidateName || 'Unknown'}</span>
                                  <span className="text-xs text-gray-400">{entry.candidateEmail || ''}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(entry.status || '')}`}>
                                  {getStatusLabel(entry.status || '')}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {entry.appliedAt ? new Date(entry.appliedAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                }) : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {entry.lastActivityAt ? new Date(entry.lastActivityAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                }) : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <Link
                                  href={`/dashboard/admin/applications/${entry.id}`}
                                  className="text-blue-600 hover:text-blue-900 hover:underline"
                                >
                                  View
                                </Link>
                              </td>
                            </>
                          ) : selectedCategory === 'career-advice' ? (
                            <>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                {entry.title || 'Untitled'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {entry.author?.name || 'Unknown'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(entry.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => handleEditCareerAdvice(entry.id)}
                                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
                                  title="Edit article"
                                >
                                  Edit
                                </button>
                              </td>
                            </>
                          ) : null}
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
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className={`px-4 py-2 rounded-md font-medium transition-colors ${
                            currentPage === 1
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                          }`}
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className={`px-4 py-2 rounded-md font-medium transition-colors ${
                            currentPage === totalPages
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                          }`}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                    {/* Page numbers - show for applications or when totalPages <= 10 */}
                    {(selectedCategory === 'applications' || totalPages <= 10) && totalPages > 1 && (
                      <div className="flex justify-center gap-1 mt-4">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                              pageNum === currentPage
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
        )}
      </main>
    </div>
  );
}

function AdminDashboardWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-lg text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <AdminDashboard />
    </Suspense>
  );
}

export default AdminDashboardWrapper;
