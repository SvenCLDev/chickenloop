'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import Navbar from '@/app/components/Navbar';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { applicationsApi } from '@/lib/api';
import { ApplicationJobSnapshot } from '@/lib/applicationTypes';
import { ApplicationStatus, getAllowedTransitions, TERMINAL_STATES, validateTransition } from '@/lib/applicationStatusTransitions';
import Link from 'next/link';

interface AdminAction {
  adminId: string;
  adminName: string;
  action: string;
  details?: string;
  timestamp: string;
}

interface Application {
  _id: string;
  status: string;
  appliedAt: string;
  lastActivityAt: string;
  withdrawnAt?: string;
  viewedAt?: string;
  recruiterNotes?: string;
  adminNotes?: string;
  coverNote?: string;
  archivedByAdmin?: boolean;
  adminActions?: AdminAction[];
  notesEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
  job: ApplicationJobSnapshot | null;
  company: {
    name: string;
    description?: string;
  } | null;
  candidate: {
    _id: string;
    name: string;
    email: string;
  } | null;
  recruiter: {
    _id: string;
    name: string;
    email: string;
  } | null;
  cv: {
    _id: string;
    fullName: string;
    summary?: string;
  } | null;
}

export default function AdminApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingAdminNotes, setSavingAdminNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [adminNotesSaved, setAdminNotesSaved] = useState(false);
  const [recruiterNotes, setRecruiterNotes] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'admin') {
      router.push(`/${user.role === 'recruiter' ? 'recruiter' : 'job-seeker'}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (mounted && user && user.role === 'admin') {
      loadApplication();
    }
  }, [mounted, user, params]);

  useEffect(() => {
    if (application) {
      setSelectedStatus(application.status);
      const applicationTitle = application.job?.title || 'Application';
      document.title = `${applicationTitle} - Application Details | Chickenloop`;
    } else {
      document.title = 'Application Details - Admin Dashboard | Chickenloop';
    }
  }, [application]);

  const loadApplication = async () => {
    const applicationId = params?.id as string;
    if (!applicationId) return;

    setLoading(true);
    setError('');
    try {
      const data = await applicationsApi.getOne(applicationId);
      setApplication(data.application);
      if (data.application.recruiterNotes !== undefined) {
        setRecruiterNotes(data.application.recruiterNotes || '');
      }
      if (data.application.adminNotes !== undefined) {
        setAdminNotes(data.application.adminNotes || '');
      }
    } catch (err: any) {
      console.error('Failed to load application:', err);
      // Provide user-friendly error messages
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        setError('Your session has expired. Please log in again.');
      } else if (err.message?.includes('403') || err.message?.includes('Forbidden')) {
        setError('You do not have permission to view this application.');
      } else if (err.message?.includes('404') || err.message?.includes('not found')) {
        setError('Application not found. It may have been deleted or the ID is invalid.');
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        setError('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'Unable to load application. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    const applicationId = params?.id as string;
    if (!applicationId || !application) return;

    if (!selectedStatus || selectedStatus === application.status) {
      return;
    }

    // Client-side validation
    const validationError = validateTransition(
      application.status as ApplicationStatus,
      selectedStatus as ApplicationStatus
    );
    if (validationError) {
      setError(validationError);
      setSelectedStatus(application.status);
      return;
    }

    setUpdatingStatus(true);
    setError('');
    setSuccessMessage('');
    
    try {
      await applicationsApi.updateStatus(applicationId, selectedStatus);
      await loadApplication();
      setSuccessMessage('Application status updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Failed to update application status:', err);
      // Provide user-friendly error messages
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        setError('Your session has expired. Please log in again.');
      } else if (err.message?.includes('403') || err.message?.includes('Forbidden')) {
        setError('You do not have permission to update this application.');
      } else if (err.message?.includes('Invalid status transition') || err.message?.includes('transition')) {
        setError(err.message || 'This status change is not allowed. Please check the transition rules.');
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        setError('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'Failed to update application status. Please try again.');
      }
      setSelectedStatus(application.status);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveNotes = async () => {
    const applicationId = params?.id as string;
    if (!applicationId || !application) return;

    setSavingNotes(true);
    setError('');
    setNotesSaved(false);
    
    try {
      await applicationsApi.updateStatus(applicationId, application.status, recruiterNotes);
      await loadApplication();
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch (err: any) {
      console.error('Failed to save notes:', err);
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        setError('Your session has expired. Please log in again.');
      } else if (err.message?.includes('403') || err.message?.includes('Forbidden')) {
        setError('You do not have permission to update notes.');
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        setError('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'Failed to save notes. Please try again.');
      }
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveAdminNotes = async () => {
    const applicationId = params?.id as string;
    if (!applicationId || !application) return;

    setSavingAdminNotes(true);
    setError('');
    setAdminNotesSaved(false);
    
    try {
      await applicationsApi.updateStatus(applicationId, application.status, undefined, adminNotes);
      await loadApplication();
      setAdminNotesSaved(true);
      setTimeout(() => setAdminNotesSaved(false), 2000);
    } catch (err: any) {
      console.error('Failed to save admin notes:', err);
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        setError('Your session has expired. Please log in again.');
      } else if (err.message?.includes('403') || err.message?.includes('Forbidden')) {
        setError('You do not have permission to update admin notes.');
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        setError('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'Failed to save admin notes. Please try again.');
      }
    } finally {
      setSavingAdminNotes(false);
    }
  };

  const handleArchiveAction = async (action: 'archive' | 'unarchive') => {
    const applicationId = params?.id as string;
    if (!applicationId || !application) return;

    const confirmMessage = action === 'archive' 
      ? 'Archive this application? This is a soft delete and can be reversed. The application will be hidden from normal views but can be restored.'
      : 'Unarchive this application? It will be restored to normal visibility.';
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setArchiving(true);
    setError('');
    setSuccessMessage('');
    
    try {
      await applicationsApi.adminAction(applicationId, action);
      await loadApplication();
      setSuccessMessage(`Application ${action === 'archive' ? 'archived' : 'unarchived'} successfully`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error(`Failed to ${action} application:`, err);
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        setError('Your session has expired. Please log in again.');
      } else if (err.message?.includes('403') || err.message?.includes('Forbidden')) {
        setError('You do not have permission to perform this action.');
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        setError('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        setError(err.message || `Failed to ${action} application. Please try again.`);
      }
    } finally {
      setArchiving(false);
    }
  };

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
        return 'Withdrawn by candidate';
      default:
        return status;
    }
  };

  const getStatusDescription = (status: string): string => {
    const descriptions: Record<string, string> = {
      applied: 'Initial application received',
      viewed: 'Application has been reviewed',
      contacted: 'Recruiter has reached out to candidate',
      interviewing: 'Candidate is in interview process',
      offered: 'Job offer has been extended',
      hired: 'Candidate accepted offer and was hired',
      accepted: 'Application accepted (legacy status)',
      rejected: 'Application was rejected',
      withdrawn: 'Candidate withdrew application',
    };
    return descriptions[status] || status;
  };

  if (!mounted || authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-lg text-gray-600">Loading application...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Breadcrumbs
              items={[
                { label: 'Admin Dashboard', href: '/admin' },
                { label: 'Applications', href: '/dashboard/admin/applications' },
                { label: 'Error' },
              ]}
            />
            <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-medium text-red-800">Error loading application</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                  <div className="mt-4">
                    <Link
                      href="/dashboard/admin/applications"
                      className="inline-flex items-center text-sm font-medium text-red-800 hover:text-red-900"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Applications
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </main>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Breadcrumbs
              items={[
                { label: 'Admin Dashboard', href: '/admin' },
                { label: 'Applications', href: '/dashboard/admin/applications' },
                { label: 'Not Found' },
              ]}
            />
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">Application not found</h3>
              <p className="text-gray-600 mb-4">
                The application you're looking for doesn't exist or may have been deleted.
              </p>
              <Link
                href="/dashboard/admin/applications"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Applications
              </Link>
            </div>
          </main>
      </div>
    );
  }

  const allowedNextStatuses = getAllowedTransitions(application.status as ApplicationStatus);
  const isTerminal = TERMINAL_STATES.includes(application.status as ApplicationStatus);
  const isWithdrawn = application.status === 'withdrawn';
  const isRejected = application.status === 'rejected';
  const isHired = application.status === 'hired';

  const applicationTitle = application.job?.title || 'Application';
  const candidateName = application.candidate?.name || 'Unknown Candidate';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Breadcrumbs
            items={[
              { label: 'Admin Dashboard', href: '/admin' },
              { label: 'Applications', href: '/dashboard/admin/applications' },
              { label: applicationTitle.length > 30 ? `${applicationTitle.substring(0, 30)}...` : applicationTitle },
            ]}
          />

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900">Application Details (Admin View)</h1>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-semibold rounded-full">
                Admin Access
              </span>
            </div>
            
            {/* Application Status Indicator */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600">Status:</span>
                  <span className={`px-4 py-2 text-base font-bold rounded-full ${getStatusColor(application.status)}`}>
                    {getStatusLabel(application.status)}
                  </span>
                </div>
                {application.viewedAt ? (
                  <span className="text-sm text-gray-600">
                    Viewed: {new Date(application.viewedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                ) : (
                  <span className="text-sm text-gray-500 italic">Not yet viewed</span>
                )}
              </div>
            </div>

            {/* Terminal State Warning */}
            {isTerminal && (
              <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Terminal State:</strong> This application is in a terminal state ({getStatusLabel(application.status)}). 
                      {isWithdrawn && ' It was withdrawn by the candidate.'}
                      {isRejected && ' It was rejected by the recruiter.'}
                      {isHired && ' The candidate was hired.'}
                      {' Status changes are restricted to prevent accidental modifications.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 space-y-6">
            {/* Success/Error Messages */}
            {successMessage && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">{successMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                  <div className="ml-auto pl-3">
                    <button
                      onClick={() => setError('')}
                      className="inline-flex text-red-400 hover:text-red-500"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Cover Note */}
            {application.coverNote && (
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Cover note</h2>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{application.coverNote}</p>
                </div>
              </div>
            )}

            {/* Candidate Information */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Seeker Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Name</p>
                  <p className="text-lg font-medium text-gray-900">
                    {application.candidate?.name || application.cv?.fullName || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Email</p>
                  <p className="text-lg text-gray-900">
                    <a href={`mailto:${application.candidate?.email}`} className="text-blue-600 hover:text-blue-800">
                      {application.candidate?.email || 'N/A'}
                    </a>
                  </p>
                </div>
                {application.candidate?._id && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">User ID</p>
                    <p className="text-sm font-mono text-gray-600">{application.candidate._id}</p>
                  </div>
                )}
              </div>

              {/* CV Summary or Link */}
              {application.cv ? (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">CV</p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {application.cv.summary ? (
                      <div>
                        <p className="text-sm text-gray-700 mb-2 font-medium">Summary:</p>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{application.cv.summary}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No summary available</p>
                    )}
                    <Link
                      href={`/candidates/${application.candidate?._id}`}
                      className="inline-block mt-3 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View Full CV →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">CV</p>
                  <p className="text-sm text-gray-500 italic">No CV available for this candidate</p>
                </div>
              )}
            </div>

            {/* Job Information */}
            {application.job ? (
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Job Title</p>
                    <p className="text-lg font-medium text-gray-900">
                      <Link
                        href={`/jobs/${application.job._id}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {application.job.title}
                      </Link>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Company</p>
                    <p className="text-lg text-gray-900">
                      {application.company?.name || application.job.company || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Location</p>
                    <p className="text-lg text-gray-900">
                      {application.job.city}
                      {application.job.country && `, ${application.job.country}`}
                    </p>
                  </div>
                  {application.job._id && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Job ID</p>
                      <p className="text-sm font-mono text-gray-600">{application.job._id}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Information</h2>
                <p className="text-gray-500 italic">No job linked to this application</p>
              </div>
            )}

            {/* Recruiter/Company Information */}
            {application.recruiter && (
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recruiter Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Recruiter Name</p>
                    <p className="text-lg font-medium text-gray-900">
                      {application.recruiter.name || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Recruiter Email</p>
                    <p className="text-lg text-gray-900">
                      <a href={`mailto:${application.recruiter.email}`} className="text-blue-600 hover:text-blue-800">
                        {application.recruiter.email || 'N/A'}
                      </a>
                    </p>
                  </div>
                  {application.recruiter._id && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Recruiter ID</p>
                      <p className="text-sm font-mono text-gray-600">{application.recruiter._id}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Application Timeline */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Application Timeline</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Applied</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(application.appliedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last Activity</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(application.lastActivityAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {application.viewedAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Viewed</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(application.viewedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
                {application.withdrawnAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Withdrawn</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(application.withdrawnAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Created</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(application.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last Updated</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(application.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Recruiter Internal Notes Section */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recruiter Internal Notes</h2>
              <div className="space-y-2">
                <textarea
                  value={recruiterNotes}
                  onChange={(e) => setRecruiterNotes(e.target.value)}
                  placeholder="Add or edit internal notes about this candidate..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 resize-y"
                  disabled={savingNotes}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveNotes}
                      disabled={savingNotes || recruiterNotes === (application.recruiterNotes || '')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      {savingNotes ? 'Saving...' : 'Save Notes'}
                    </button>
                    {notesSaved && (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Saved
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Admin can edit recruiter notes</p>
                </div>
              </div>
            </div>

            {/* Admin Notes Section */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Private Notes</h2>
              <p className="text-sm text-gray-600 mb-3">
                Private notes visible only to admins. These notes are separate from recruiter notes and are not visible to recruiters or job seekers.
              </p>
              <div className="space-y-2">
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add private admin notes about this application..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 resize-y"
                  disabled={savingAdminNotes}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveAdminNotes}
                      disabled={savingAdminNotes || adminNotes === (application.adminNotes || '')}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      {savingAdminNotes ? 'Saving...' : 'Save Admin Notes'}
                    </button>
                    {adminNotesSaved && (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Saved
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Admin-only notes</p>
                </div>
              </div>
            </div>

            {/* Admin Actions Log */}
            {application.adminActions && application.adminActions.length > 0 && (
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Actions Log</h2>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  {application.adminActions
                    .slice()
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((action, index) => (
                      <div key={index} className="border-b border-gray-200 pb-3 last:border-b-0 last:pb-0">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {action.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </p>
                            {action.details && (
                              <p className="text-xs text-gray-600 mt-1">{action.details}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              by {action.adminName}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                            {new Date(action.timestamp).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Admin Actions */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Actions</h2>
              
              <div className="space-y-4">
                {/* Status Update Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Application Status
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <select
                        value={selectedStatus}
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          setSelectedStatus(newStatus);
                          // Clear error when user changes selection
                          if (error) setError('');
                        }}
                        disabled={updatingStatus || isTerminal}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed text-gray-900"
                      >
                        <option value={application.status}>
                          {getStatusLabel(application.status)} (current)
                        </option>
                        {allowedNextStatuses.map((status) => (
                          <option key={status} value={status}>
                            {getStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                      {selectedStatus && selectedStatus !== application.status && (
                        <p className="mt-1 text-xs text-gray-600">
                          {getStatusDescription(selectedStatus)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleUpdateStatus}
                      disabled={updatingStatus || isTerminal || selectedStatus === application.status}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
                    >
                      {updatingStatus ? 'Saving...' : 'Save Status'}
                    </button>
                  </div>
                  {isTerminal ? (
                    <p className="mt-2 text-xs text-yellow-600">
                      ⚠️ This application is in a terminal state ({getStatusLabel(application.status)}) and cannot be modified. 
                      Status changes are restricted to prevent accidental modifications.
                    </p>
                  ) : allowedNextStatuses.length === 0 ? (
                    <p className="mt-2 text-xs text-gray-500">
                      No status transitions available from "{getStatusLabel(application.status)}".
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500">
                      Select a new status from the dropdown. Only valid transitions are shown. 
                      Invalid transitions will be rejected by the server.
                    </p>
                  )}
                </div>

                {/* Archive/Unarchive Section */}
                <div className="border-t border-gray-300 pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Moderation Actions</h3>
                  {application.archivedByAdmin ? (
                    <div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-3">
                        <p className="text-sm text-yellow-800">
                          <strong>Archived:</strong> This application has been archived by an admin. It is hidden from normal views but can be restored.
                        </p>
                      </div>
                      <button
                        onClick={() => handleArchiveAction('unarchive')}
                        disabled={archiving}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        {archiving ? 'Processing...' : 'Unarchive Application'}
                      </button>
                      <p className="mt-2 text-xs text-gray-500">
                        Restore this application to normal visibility. This is a soft action and can be reversed.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <button
                        onClick={() => handleArchiveAction('archive')}
                        disabled={archiving}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        {archiving ? 'Processing...' : 'Archive Application'}
                      </button>
                      <p className="mt-2 text-xs text-gray-500">
                        Archive this application (soft delete). It will be hidden from normal views but can be restored. 
                        This action is logged and does not affect recruiter or job seeker dashboards.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
