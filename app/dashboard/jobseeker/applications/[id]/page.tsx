'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import Navbar from '@/app/components/Navbar';
import { applicationsApi } from '@/lib/api';
import Link from 'next/link';

interface Application {
  _id: string;
  status: string;
  appliedAt: string;
  lastActivityAt: string;
  withdrawnAt?: string;
  viewedAt?: string;
  createdAt: string;
  updatedAt: string;
  job: {
    _id: string;
    title: string;
    company: string;
    location: string;
    country?: string;
  } | null;
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
}

export default function JobSeekerApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'job-seeker') {
      router.push(`/${user.role === 'admin' ? 'admin' : 'recruiter'}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (mounted && user && user.role === 'job-seeker') {
      loadApplication();
    }
  }, [mounted, user, params]);

  const loadApplication = async () => {
    const applicationId = params?.id as string;
    if (!applicationId) return;

    setLoading(true);
    setError('');
    try {
      const data = await applicationsApi.getOne(applicationId);
      setApplication(data.application);
    } catch (err: any) {
      setError(err.message || 'Failed to load application');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'contacted':
        return 'bg-purple-100 text-purple-800';
      case 'interviewed':
        return 'bg-yellow-100 text-yellow-800';
      case 'offered':
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
      case 'new':
        return 'Application sent';
      case 'contacted':
        return 'Recruiter contacted you';
      case 'interviewed':
        return 'Interview stage';
      case 'offered':
        return 'Offer made';
      case 'rejected':
        return 'Application not successful';
      case 'withdrawn':
        return 'Application withdrawn';
      default:
        return status;
    }
  };

  const handleWithdrawApplication = async () => {
    if (!application) return;

    const jobTitle = application.job?.title || 'this position';
    if (!confirm(`Are you sure you want to withdraw your application for "${jobTitle}"? This action cannot be undone.`)) {
      return;
    }

    setWithdrawing(true);
    setError('');
    try {
      await applicationsApi.withdraw(application._id);
      // Reload application to get updated data
      await loadApplication();
    } catch (err: any) {
      setError(err.message || 'Failed to withdraw application');
    } finally {
      setWithdrawing(false);
    }
  };

  const handleRemoveFromList = async () => {
    if (!application) return;

    if (!confirm('Remove this application from your list? You can still access it via direct link.')) {
      return;
    }

    setArchiving(true);
    setError('');
    try {
      await applicationsApi.archive(application._id, true);
      // Redirect back to applications list
      router.push('/job-seeker');
    } catch (err: any) {
      setError(err.message || 'Failed to remove application from list');
      setArchiving(false);
    }
  };

  if (!mounted || authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">Error</p>
            <p>{error}</p>
            <Link href="/job-seeker" className="text-blue-600 hover:underline mt-2 inline-block">
              ← Back to Dashboard
            </Link>
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
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-600">Application not found.</p>
            <Link href="/job-seeker" className="text-blue-600 hover:underline mt-2 inline-block">
              ← Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const isWithdrawn = application.status === 'withdrawn';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Link */}
        <Link
          href="/job-seeker"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header Section */}
          <div className={`bg-gradient-to-r ${isWithdrawn ? 'from-gray-50 to-gray-100' : 'from-blue-50 to-cyan-50'} px-6 py-6 border-b border-gray-200`}>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Application Details</h1>
            <div className="flex items-center gap-4 flex-wrap">
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(application.status)}`}>
                {getStatusLabel(application.status)}
              </span>
              {application.viewedAt ? (
                <span className="text-sm text-gray-600">
                  Viewed by recruiter: {new Date(application.viewedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              ) : (
                <span className="text-sm text-gray-500 italic">Not yet viewed by recruiter</span>
              )}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Job Information */}
            {application.job && (
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
                </div>
              </div>
            )}

            {/* Recruiter Message Section */}
            {/* Note: This feature is not yet implemented in the Application model */}
            {/* When a recruiter message field is added, it will be displayed here */}
            {application.status === 'contacted' || application.status === 'interviewed' || application.status === 'offered' ? (
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recruiter Communication</h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    {application.recruiter?.name ? (
                      <>
                        <strong>{application.recruiter.name}</strong> has updated your application status.
                        {application.recruiter.email && (
                          <> You can contact them at <a href={`mailto:${application.recruiter.email}`} className="text-blue-600 hover:text-blue-800">{application.recruiter.email}</a>.</>
                        )}
                      </>
                    ) : (
                      'The recruiter has updated your application status.'
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-2 italic">
                    Note: Direct messaging feature coming soon. For now, please contact the recruiter via email if needed.
                  </p>
                </div>
              </div>
            ) : null}

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
              </div>
            </div>

            {/* Actions Section */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-4">
                {/* Withdraw Application Button */}
                {!isWithdrawn && (
                  <div>
                    <button
                      onClick={handleWithdrawApplication}
                      disabled={withdrawing}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {withdrawing ? 'Withdrawing...' : 'Withdraw Application'}
                    </button>
                    <p className="mt-2 text-sm text-gray-500">
                      Withdrawing your application will notify the recruiter. This action cannot be undone.
                    </p>
                  </div>
                )}

                {/* Remove from List Button */}
                {(application.status === 'withdrawn' || application.status === 'rejected') && (
                  <div>
                    <button
                      onClick={handleRemoveFromList}
                      disabled={archiving}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {archiving ? 'Removing...' : 'Remove from list'}
                    </button>
                    <p className="mt-2 text-sm text-gray-500">
                      Remove this application from your applications list. You can still access it via direct link.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
