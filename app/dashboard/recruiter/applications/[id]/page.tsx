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
  recruiterNotes?: string;
  notesEnabled?: boolean; // Feature flag from API
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
  cv: {
    _id: string;
    fullName: string;
    summary?: string;
  } | null;
}

export default function RecruiterApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [contactingCandidate, setContactingCandidate] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [recruiterNotes, setRecruiterNotes] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'recruiter' && user.role !== 'admin') {
      router.push(`/${user.role === 'job-seeker' ? 'job-seeker' : 'admin'}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (mounted && user && (user.role === 'recruiter' || user.role === 'admin')) {
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
      // Initialize recruiterNotes from application data
      if (data.application.recruiterNotes !== undefined) {
        setRecruiterNotes(data.application.recruiterNotes || '');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load application');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    const applicationId = params?.id as string;
    if (!applicationId || !application) return;

    setUpdatingStatus(true);
    setError('');
    setSuccessMessage('');
    
    try {
      await applicationsApi.updateStatus(applicationId, newStatus);
      // Reload application to get updated data
      await loadApplication();
      setSuccessMessage('Application status updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update application status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleContactCandidate = async () => {
    const applicationId = params?.id as string;
    if (!applicationId) return;

    if (!confirm('Send a contact email to this candidate?')) {
      return;
    }

    setContactingCandidate(true);
    setError('');
    setSuccessMessage('');
    
    try {
      await applicationsApi.contactCandidate(applicationId);
      // Reload application to get updated lastActivityAt
      await loadApplication();
      setSuccessMessage('Contact email sent successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to send contact email');
    } finally {
      setContactingCandidate(false);
    }
  };

  const handleArchiveApplication = async () => {
    const applicationId = params?.id as string;
    if (!applicationId) return;

    if (!confirm('Archive this application? It will be removed from your active applications list.')) {
      return;
    }

    setArchiving(true);
    setError('');
    setSuccessMessage('');
    
    try {
      await applicationsApi.archive(applicationId, undefined, true);
      // Redirect back to recruiter dashboard (ATS list)
      router.push('/recruiter');
    } catch (err: any) {
      setError(err.message || 'Failed to archive application');
      setArchiving(false);
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
      // Reload application to get updated data
      await loadApplication();
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleNotesBlur = () => {
    // Auto-save on blur if notes have changed
    if (application && recruiterNotes !== (application.recruiterNotes || '')) {
      handleSaveNotes();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800';
      case 'interviewed':
        return 'bg-purple-100 text-purple-800';
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
        return 'New';
      case 'contacted':
        return 'Contacted';
      case 'interviewed':
        return 'Interviewed';
      case 'offered':
        return 'Offered';
      case 'rejected':
        return 'Rejected';
      case 'withdrawn':
        return 'Withdrawn by candidate';
      default:
        return status;
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">Error</p>
            <p>{error}</p>
            <Link href="/recruiter" className="text-blue-600 hover:underline mt-2 inline-block">
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
            <Link href="/recruiter" className="text-blue-600 hover:underline mt-2 inline-block">
              ← Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Link */}
        <Link
          href="/recruiter"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-6 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Application Details</h1>
            <div className="flex items-center gap-4 flex-wrap">
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(application.status)}`}>
                {getStatusLabel(application.status)}
              </span>
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

          <div className="p-6 space-y-6">
            {/* Candidate Information */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Candidate Information</h2>
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
                      {application.job.location}
                      {application.job.country && `, ${application.job.country}`}
                    </p>
                  </div>
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

            {/* Internal Notes Section */}
            {(user?.role === 'recruiter' || user?.role === 'admin') && application.notesEnabled !== false && (
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Internal Notes</h2>
                <div className="space-y-2">
                  <textarea
                    value={recruiterNotes}
                    onChange={(e) => setRecruiterNotes(e.target.value)}
                    onBlur={handleNotesBlur}
                    placeholder="Add internal notes about this candidate..."
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
                        {savingNotes ? 'Saving...' : 'Save'}
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
                    <p className="text-xs text-gray-500">Auto-saves on blur</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recruiter Actions */}
            {(user?.role === 'recruiter' || user?.role === 'admin') && application.status !== 'withdrawn' && (
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions</h2>
                
                {/* Success Message */}
                {successMessage && (
                  <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                    {successMessage}
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Status Update */}
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                      Update Application Status
                    </label>
                    <select
                      id="status"
                      value={application.status}
                      onChange={(e) => handleUpdateStatus(e.target.value)}
                      disabled={updatingStatus || application.status === 'withdrawn'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="interviewed">Interviewed</option>
                      <option value="offered">Offered</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    {updatingStatus && (
                      <p className="mt-2 text-sm text-gray-500">Updating status...</p>
                    )}
                  </div>

                  {/* Contact Candidate Button */}
                  <div>
                    <button
                      onClick={handleContactCandidate}
                      disabled={contactingCandidate}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {contactingCandidate ? 'Sending...' : 'Contact Candidate'}
                    </button>
                    <p className="mt-2 text-sm text-gray-500">
                      Send an email notification to the candidate about this application.
                    </p>
                  </div>

                  {/* Archive Application Button */}
                  {(application.status === 'rejected' || application.status === 'withdrawn') && (
                    <div>
                      <button
                        onClick={handleArchiveApplication}
                        disabled={archiving}
                        className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {archiving ? 'Archiving...' : 'Archive application'}
                      </button>
                      <p className="mt-2 text-sm text-gray-500">
                        Remove this application from your active applications list. You can still access it via direct link.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
