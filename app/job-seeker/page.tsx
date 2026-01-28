'use client';

import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '../components/Navbar';
import { jobsApi, cvApi, savedSearchesApi, applicationsApi } from '@/lib/api';
import { getCountryNameFromCode } from '@/lib/countryUtils';
import { ApplicationStatus, TERMINAL_STATES, getAllowedTransitions } from '@/lib/applicationStatusTransitions';
import { isApplicationStatus } from '@/lib/domainTypes';
import { getJobUrl } from '@/lib/jobSlug';
import Link from 'next/link';

interface Job {
  _id: string;
  title: string;
  description: string;
  company: string;
  city: string;
  salary?: string;
  type: string;
  recruiter: {
    name: string;
    email: string;
  };
  createdAt: string;
}

export default function JobSeekerDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    }>
      <JobSeekerDashboardClient />
    </Suspense>
  );
}

function JobSeekerDashboardClient() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [favouriteJobs, setFavouriteJobs] = useState<Job[]>([]);
  const [cv, setCv] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingPublish, setTogglingPublish] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [loadingSearches, setLoadingSearches] = useState(false);
  const [editingSearch, setEditingSearch] = useState<string | null>(null);
  const [editSearchName, setEditSearchName] = useState('');
  const [editSearchFrequency, setEditSearchFrequency] = useState<'daily' | 'weekly' | 'never'>('weekly');
  const [editSearchActive, setEditSearchActive] = useState(false);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [withdrawingApplication, setWithdrawingApplication] = useState<string | null>(null);
  const [archivingApplication, setArchivingApplication] = useState<string | null>(null);
  const [unsubscribedCategory, setUnsubscribedCategory] = useState<string | null>(null);
  const [showUnsubscribedNotification, setShowUnsubscribedNotification] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'job-seeker') {
      router.push(`/${user.role === 'admin' ? 'admin' : 'recruiter'}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && user.role === 'job-seeker') {
      loadData();
      loadSavedSearches();
      loadMyApplications();
    }
  }, [user]);

  // Handle unsubscribe notification
  useEffect(() => {
    const unsubscribed = searchParams.get('unsubscribed');
    const category = searchParams.get('category');
    if (unsubscribed === 'true' && category) {
      setUnsubscribedCategory(category);
      setShowUnsubscribedNotification(true);
      // Remove query params from URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete('unsubscribed');
      url.searchParams.delete('category');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      const [favouritesData, cvData] = await Promise.all([
        jobsApi.getFavourites().catch(() => ({ jobs: [] })),
        cvApi.get().catch(() => null),
      ]);
      setFavouriteJobs(favouritesData.jobs || []);
      setCv(cvData?.cv || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedSearches = async () => {
    setLoadingSearches(true);
    try {
      const data = await savedSearchesApi.getAll();
      setSavedSearches(data.savedSearches || []);
    } catch (err: any) {
      console.error('Failed to load saved searches:', err);
    } finally {
      setLoadingSearches(false);
    }
  };

  const handleToggleSearchActive = async (searchId: string, currentActive: boolean) => {
    try {
      await savedSearchesApi.update(searchId, { active: !currentActive });
      await loadSavedSearches();
    } catch (err: any) {
      alert(err.message || 'Failed to update search');
    }
  };

  const handleEditSearch = (search: any) => {
    setEditingSearch(search._id);
    setEditSearchName(search.name || '');
    setEditSearchFrequency(search.frequency || 'weekly');
    setEditSearchActive(search.active || false);
  };

  const handleSaveEdit = async (searchId: string) => {
    if (!editSearchName.trim()) {
      alert('Please enter a name for your saved search');
      return;
    }

    try {
      await savedSearchesApi.update(searchId, {
        name: editSearchName.trim(),
        frequency: editSearchFrequency,
        active: editSearchActive,
      });
      setEditingSearch(null);
      await loadSavedSearches();
    } catch (err: any) {
      alert(err.message || 'Failed to update search');
    }
  };

  const handleDeleteSearch = async (searchId: string, searchName: string) => {
    if (!confirm(`Are you sure you want to delete "${searchName}"?`)) return;

    try {
      await savedSearchesApi.delete(searchId);
      await loadSavedSearches();
    } catch (err: any) {
      alert(err.message || 'Failed to delete search');
    }
  };

  const loadMyApplications = async () => {
    setLoadingApplications(true);
    try {
      const data = await applicationsApi.getMyApplications();
      setMyApplications(data.applications || []);
    } catch (err: any) {
      console.error('Failed to load applications:', err);
      // Don't show error to user, just log it
    } finally {
      setLoadingApplications(false);
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
        return 'Application sent';
      case 'viewed':
        return 'Viewed by recruiter';
      case 'contacted':
        return 'Contacted';
      case 'interviewing':
        return 'Interviewing';
      case 'offered':
        return 'Offer made';
      case 'hired':
        return 'Hired';
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Not successful';
      case 'withdrawn':
        return 'Withdrawn';
      default:
        return status;
    }
  };

  // Timeline statuses in order
  const TIMELINE_STATUSES: ApplicationStatus[] = ['applied', 'viewed', 'contacted', 'interviewing', 'offered', 'hired'];

  // Check if withdrawal is allowed based on transition rules
  const canWithdrawStatus = (status: string): boolean => {
    if (!isApplicationStatus(status)) return false;
    const allowedTransitions = getAllowedTransitions(status);
    return allowedTransitions.includes('withdrawn');
  };

  const handleWithdrawApplication = async (applicationId: string, jobTitle: string) => {
    // Confirmation dialog
    if (!confirm(`Are you sure you want to withdraw your application for "${jobTitle}"? This action cannot be undone.`)) {
      return;
    }

    setWithdrawingApplication(applicationId);
    try {
      await applicationsApi.withdraw(applicationId);
      // Reload applications to get updated data from server
      await loadMyApplications();
    } catch (err: any) {
      alert(err.message || 'Failed to withdraw application');
    } finally {
      setWithdrawingApplication(null);
    }
  };

  const handleRemoveFromList = async (applicationId: string) => {
    if (!confirm('Remove this application from your list? You can still access it via direct link.')) {
      return;
    }

    setArchivingApplication(applicationId);
    try {
      await applicationsApi.archive(applicationId, true);
      // Reload applications list to remove archived application
      await loadMyApplications();
    } catch (err: any) {
      alert(err.message || 'Failed to remove application from list');
    } finally {
      setArchivingApplication(null);
    }
  };

  const handleDeleteCV = async () => {
    if (!confirm('Are you sure you want to delete your CV?')) return;

    try {
      await cvApi.delete();
      setCv(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete CV');
    }
  };

  const handleRemoveFavourite = async (jobId: string) => {
    if (!confirm('Remove this job from your favourites?')) return;

    try {
      await jobsApi.toggleFavourite(jobId);
      // Reload favourites to update the list
      const favouritesData = await jobsApi.getFavourites().catch(() => ({ jobs: [] }));
      setFavouriteJobs(favouritesData.jobs || []);
    } catch (err: any) {
      alert(err.message || 'Failed to remove from favourites');
    }
  };

  const handleTogglePublish = async () => {
    setTogglingPublish(true);
    try {
      const response = await cvApi.togglePublish();
      // Reload CV to get updated published status
      const cvData = await cvApi.get().catch(() => null);
      if (cvData?.cv) {
        setCv(cvData.cv);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to toggle CV visibility');
    } finally {
      setTogglingPublish(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactForm),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitMessage(data.message || 'Thank you for your feedback!');
        setContactForm({ name: '', email: '', message: '' });
        setTimeout(() => {
          setShowContactModal(false);
          setSubmitMessage('');
        }, 2000);
      } else {
        // If email service is not configured, show fallback message
        if (data.fallback) {
          setSubmitMessage('Email service is not configured. Please contact us directly at hello@chickenloop.com');
        } else {
          setSubmitMessage(data.error || 'Failed to send message. Please try again.');
        }
      }
    } catch (err: any) {
      setSubmitMessage('Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
        {/* Unsubscribe Notification */}
        {showUnsubscribedNotification && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-sm font-semibold text-blue-900">Email Preferences Updated</h3>
              </div>
              <p className="text-sm text-blue-700 mb-3">
                {unsubscribedCategory === 'important_transactional' 
                  ? 'You have been unsubscribed from application update emails. You can re-enable these emails from your account settings.'
                  : unsubscribedCategory === 'user_notification'
                  ? 'You have been unsubscribed from job alert emails. You can re-enable these emails from your account settings.'
                  : 'Your email preferences have been updated. You can manage your preferences from your account settings.'
                }
              </p>
              <Link
                href="/job-seeker/account/edit"
                className="inline-block text-sm font-medium text-blue-600 hover:text-blue-800 underline"
              >
                Manage Email Preferences →
              </Link>
            </div>
            <button
              onClick={() => setShowUnsubscribedNotification(false)}
              className="ml-4 text-blue-400 hover:text-blue-600"
              aria-label="Dismiss notification"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Job Seeker Dashboard</h1>
          
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">My CV</h2>
            {cv ? (
              <div>
                <p className="text-gray-600 mb-4">
                  You have created a CV.<br />
                  Your CV is only visible to registered recruiters.
                </p>
                <div className="flex gap-4 flex-wrap">
                  <Link
                    href="/job-seeker/cv/view"
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    View CV
                  </Link>
                  <Link
                    href="/job-seeker/cv/edit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Edit CV
                  </Link>
                  <button
                    onClick={handleTogglePublish}
                    disabled={togglingPublish}
                    className={`px-4 py-2 rounded font-medium transition-colors ${
                      cv.published === false
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'bg-gray-600 text-white hover:bg-gray-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {togglingPublish ? 'Updating...' : (cv.published === false ? 'Show CV' : 'Hide CV')}
                  </button>
                  <button
                    onClick={handleDeleteCV}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    Delete CV
                  </button>
                </div>
                {cv.published === false && (
                  <p className="text-sm text-orange-600 mt-2">
                    Your CV is currently hidden, nobody except from you can see it.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">You don't have a CV yet.</p>
                <Link
                  href="/job-seeker/cv/new"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold inline-block"
                >
                  Create CV
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* My Account Section */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">My Account</h2>
            <p className="text-gray-600 mb-4">
              Manage your account settings and preferences.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link
                href="/job-seeker/account/edit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Edit Account
              </Link>
              <Link
                href="/job-seeker/account/change-password"
                className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
              >
                Change Password
              </Link>
              <Link
                href="/job-seeker/account/delete"
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Delete Account
              </Link>
            </div>
          </div>
        </div>

        {/* My Applications Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">My Applications</h2>
          {loadingApplications ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600">Loading applications...</p>
            </div>
          ) : myApplications.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600">You have not applied to any jobs yet.</p>
              <p className="text-gray-500 text-sm mt-2">
                Browse jobs and click "Instant Application" to submit your application.
              </p>
              <Link
                href="/jobs"
                className="inline-block mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
              >
                Browse Jobs
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Job Title
                      </th>
                      <th className="px-4 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-4 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Applied
                      </th>
                      <th className="px-4 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Updated
                      </th>
                      <th className="px-4 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  {myApplications.map((application) => {
                      const currentStatus = isApplicationStatus(application.status) ? application.status : 'applied';
                      const isWithdrawn = currentStatus === 'withdrawn';
                      const isRejected = currentStatus === 'rejected';
                      const isTerminal = TERMINAL_STATES.includes(currentStatus);
                      const canRemove = isWithdrawn || isRejected;
                      const canWithdraw = canWithdrawStatus(currentStatus);
                      const isInactive = isTerminal;
                      
                      // Find current status position in timeline
                      const currentStatusIndex = TIMELINE_STATUSES.indexOf(currentStatus);
                      const isInTimeline = currentStatusIndex !== -1;

                      const visibleColumnCount = 5;

                      return (
                        <tbody key={application._id} className="group border-b border-gray-200 last:border-b-0 bg-white">
                          <tr
                            className={`border-b-0 group-hover:bg-gray-50 ${isInactive ? 'opacity-60' : ''}`}
                          >
                            <td className="px-4 py-3 sm:px-6 sm:py-4 min-w-0 max-w-[50%] sm:max-w-none text-sm font-medium">
                              {application.job ? (
                                <div className="min-w-0 truncate">
                                  <Link
                                    href={getJobUrl(application.job)}
                                    className={`block truncate ${isInactive 
                                      ? 'text-gray-400 hover:text-gray-500 hover:underline font-medium' 
                                      : 'text-blue-600 hover:text-blue-900 hover:underline font-medium'
                                    }`}
                                  >
                                    {application.job.title}
                                  </Link>
                                </div>
                              ) : (
                                <span className="text-gray-400">Job no longer available</span>
                              )}
                            </td>
                            <td className={`px-4 py-3 sm:px-6 sm:py-4 min-w-0 max-w-[30%] sm:max-w-none text-sm truncate ${isInactive ? 'text-gray-400' : 'text-gray-500'}`}>
                              {application.company ? (
                                <span className="block truncate">{application.company.name}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className={`px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm ${isInactive ? 'text-gray-400' : 'text-gray-500'}`}>
                              {(application.appliedAt ?? application.createdAt)
                                ? new Date(application.appliedAt ?? application.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : '-'}
                            </td>
                            <td className={`px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm ${isInactive ? 'text-gray-400' : 'text-gray-500'}`}>
                              {application.updatedAt
                                ? new Date(application.updatedAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : application.lastActivityAt
                                  ? new Date(application.lastActivityAt).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })
                                  : application.appliedAt
                                    ? new Date(application.appliedAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                      })
                                    : '-'}
                            </td>
                            <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm font-medium">
                              {canRemove ? (
                                <button
                                  onClick={() => handleRemoveFromList(application._id)}
                                  disabled={archivingApplication === application._id}
                                  className="text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {archivingApplication === application._id ? 'Removing...' : 'Remove from list'}
                                </button>
                              ) : canWithdraw ? (
                                <button
                                  onClick={() => handleWithdrawApplication(application._id, application.job?.title || 'this job')}
                                  disabled={withdrawingApplication === application._id}
                                  className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {withdrawingApplication === application._id ? 'Withdrawing...' : 'Withdraw application'}
                                </button>
                              ) : (
                                <span className="text-gray-400 text-xs">
                                  Cannot withdraw
                                </span>
                              )}
                            </td>
                          </tr>
                          <tr className="group-hover:bg-gray-50">
                            <td colSpan={visibleColumnCount} className="px-4 py-4 sm:px-6 min-w-0 align-top border-t-0">
                              <div className="application-pipeline-row min-w-0 w-full">
                                {isInTimeline ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-1 flex-wrap min-w-0">
                                      {TIMELINE_STATUSES.map((status, index) => {
                                        const isActive = status === currentStatus;
                                        const isPast = currentStatusIndex !== -1 && index < currentStatusIndex;
                                        return (
                                          <div key={status} className="flex items-center gap-1">
                                            <div
                                              className={`px-2 py-1 text-xs font-medium rounded ${
                                                isActive
                                                  ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                                                  : isPast
                                                  ? 'bg-gray-200 text-gray-700'
                                                  : 'bg-gray-100 text-gray-400'
                                              }`}
                                            >
                                              {getStatusLabel(status)}
                                            </div>
                                            {index < TIMELINE_STATUSES.length - 1 && (
                                              <span className={`text-xs ${isPast || isActive ? 'text-gray-400' : 'text-gray-300'}`}>→</span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Recruiters may contact you outside the platform.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(currentStatus)}`}>
                                      {getStatusLabel(currentStatus)}
                                    </span>
                                    {isTerminal && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        This application is in a final state.
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      );
                    })}
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Saved Searches Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Job Search Alerts</h2>
          {loadingSearches ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600">Loading saved searches...</p>
            </div>
          ) : savedSearches.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600">You don't have any saved searches yet.</p>
              <p className="text-gray-500 text-sm mt-2">
                Use the "Save Search" button on the jobs page to create email alerts for new jobs matching your criteria.
              </p>
              <Link
                href="/jobs"
                className="inline-block mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
              >
                Browse Jobs
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Search Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Criteria
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Frequency
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {savedSearches.map((search) => (
                      <tr key={search._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {editingSearch === search._id ? (
                            <input
                              type="text"
                              value={editSearchName}
                              onChange={(e) => setEditSearchName(e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-gray-900"
                            />
                          ) : (
                            (() => {
                              // Build URL with all search filters as query parameters
                              const params = new URLSearchParams();
                              if (search.keyword) params.set('keyword', search.keyword);
                              if (search.location) params.set('location', search.location);
                              if (search.country) params.set('country', search.country);
                              if (search.category) params.set('category', search.category);
                              // Support both activity (canonical) and sport (backward compatibility)
                              if (search.activity || search.sport) params.set('activity', search.activity || search.sport);
                              if (search.language) params.set('language', search.language);
                              
                              const queryString = params.toString();
                              const jobsUrl = queryString ? `/jobs?${queryString}` : '/jobs';
                              
                              return (
                                <Link
                                  href={jobsUrl}
                                  className="text-blue-600 hover:text-blue-900 hover:underline"
                                >
                                  {search.name || 'Unnamed Search'}
                                </Link>
                              );
                            })()
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div className="flex flex-wrap gap-2">
                            {search.keyword && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                Keyword: {search.keyword}
                              </span>
                            )}
                            {search.location && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                Location: {search.location}
                              </span>
                            )}
                            {search.country && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                                Country: {getCountryNameFromCode(search.country)}
                              </span>
                            )}
                            {search.category && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                                Category: {search.category}
                              </span>
                            )}
                            {(search.activity || search.sport) && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                                Activity: {search.activity || search.sport}
                              </span>
                            )}
                            {search.language && (
                              <span className="px-2 py-1 bg-pink-100 text-pink-800 rounded text-xs">
                                Language: {search.language}
                              </span>
                            )}
                            {!search.keyword && !search.location && !search.country && !search.category && !search.activity && !search.sport && !search.language && (
                              <span className="text-gray-400 text-xs">No filters</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {editingSearch === search._id ? (
                            <select
                              value={editSearchFrequency}
                              onChange={(e) => setEditSearchFrequency(e.target.value as 'daily' | 'weekly' | 'never')}
                              className="px-2 py-1 border border-gray-300 rounded text-gray-900"
                            >
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="never">Never</option>
                            </select>
                          ) : (
                            <span className="capitalize">{search.frequency || 'weekly'}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {editingSearch === search._id ? (
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={editSearchActive}
                                onChange={(e) => setEditSearchActive(e.target.checked)}
                                className="rounded"
                              />
                              <span className={editSearchActive ? 'text-green-600 font-medium' : 'text-gray-500'}>
                                {editSearchActive ? 'Active' : 'Inactive'}
                              </span>
                            </label>
                          ) : (
                            <button
                              onClick={() => handleToggleSearchActive(search._id, search.active)}
                              className={`px-3 py-1 rounded text-xs font-medium ${
                                search.active
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {search.active ? 'Active' : 'Inactive'}
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {editingSearch === search._id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveEdit(search._id)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingSearch(null)}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditSearch(search)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteSearch(search._id, search.name || 'Unnamed Search')}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Favourite Jobs Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">My Favourite Jobs</h2>
          {favouriteJobs.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600">You haven't added any jobs to your favourites yet.</p>
              <p className="text-gray-500 text-sm mt-2">
                Click "Add to Favourites" on any job listing to save it here.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Salary
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Posted
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {favouriteJobs.map((job) => (
                      <tr key={job._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <Link
                            href={getJobUrl(job)}
                            className="text-blue-600 hover:text-blue-900 hover:underline"
                          >
                            {job.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {job.company}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {job.city}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            {job.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {job.salary || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleRemoveFavourite(job._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Feedback Section */}
        <div className="mb-8 flex justify-end">
          <div className="bg-white rounded-lg shadow-md p-6 max-w-sm border border-gray-200">
            <p className="text-sm text-gray-700 mb-3">
              <span className="text-red-600">Feedback or Feature Requests?</span><br />
              We love to hear from you!
            </p>
            <button
              onClick={() => {
                setContactForm({ 
                  name: user?.name || '', 
                  email: user?.email || '', 
                  message: '' 
                });
                setShowContactModal(true);
              }}
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold text-sm text-center w-full"
            >
              Send Mail to Site Admin
            </button>
          </div>
        </div>

        {/* Contact Modal */}
        {showContactModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => !submitting && setShowContactModal(false)}
          >
            <div 
              className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Contact Us</h2>
              <form onSubmit={handleContactSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    required
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Tell us your feedback or feature request..."
                  />
                </div>
                {submitMessage && (
                  <div className={`mb-4 p-3 rounded-md ${
                    submitMessage.includes('Thank you') 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {submitMessage}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Sending...' : 'Send Message'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowContactModal(false)}
                    disabled={submitting}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

