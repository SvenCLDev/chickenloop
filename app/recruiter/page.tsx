'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { jobsApi, companyApi, candidatesApi } from '@/lib/api';
import Link from 'next/link';

interface Job {
  _id: string;
  title: string;
  description: string;
  company: string;
  city: string;
  salary?: string;
  type: string;
  pictures?: string[];
  published?: boolean;
  featured?: boolean;
  visitCount?: number;
  createdAt: string;
}

interface Candidate {
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

export default function RecruiterDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasCompany, setHasCompany] = useState<boolean | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [companyId, setCompanyId] = useState<string>('');
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [favouriteCandidates, setFavouriteCandidates] = useState<Candidate[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'recruiter') {
      router.push(`/${user.role === 'admin' ? 'admin' : 'job-seeker'}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && user.role === 'recruiter') {
      checkCompany();
      loadJobs();
      loadFavouriteCandidates();
      loadApplications();
    }
  }, [user]);

  const checkCompany = async () => {
    try {
      const data = await companyApi.get();
      setHasCompany(true);
      setCompanyName(data.company?.name || '');
      const id = data.company?._id || data.company?.id;
      setCompanyId(id ? String(id) : '');
    } catch (err: any) {
      if (err.message.includes('not found')) {
        setHasCompany(false);
      } else {
        setError(err.message || 'Failed to check company status');
      }
    }
  };

  const handleDeleteCompany = async () => {
    if (!confirm('Are you absolutely sure you want to delete your company? This action cannot be undone and will delete all your job postings.')) {
      return;
    }

    try {
      await companyApi.delete();
      setHasCompany(false);
      setCompanyName('');
      setCompanyId('');
      setJobs([]);
      router.push('/recruiter');
    } catch (err: any) {
      alert(err.message || 'Failed to delete company');
    }
  };

  const loadJobs = async () => {
    try {
      const data = await jobsApi.getMyJobs();
      // Ensure published field is properly set (default to true if undefined, preserve false)
      const jobsWithPublished = data.jobs.map((job: Job) => ({
        ...job,
        published: job.published === undefined ? true : job.published,
      }));
      setJobs(jobsWithPublished);
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const loadFavouriteCandidates = async () => {
    try {
      const data = await candidatesApi.getFavourites().catch(() => ({ cvs: [] }));
      setFavouriteCandidates(data.cvs || []);
    } catch (err: any) {
      // Silently fail - not critical for dashboard load
      console.error('Failed to load favourite candidates:', err);
    }
  };

  const loadApplications = async () => {
    setLoadingApplications(true);
    try {
      const response = await fetch('/api/applications', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      }
    } catch (err: any) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoadingApplications(false);
    }
  };

  const handleUpdateStatus = async (applicationId: string, newStatus: string) => {
    setUpdatingStatus(applicationId);
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Reload applications to get updated data
        await loadApplications();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update application status');
      }
    } catch (err: any) {
      alert('Failed to update application status. Please try again.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleRemoveFavourite = async (cvId: string) => {
    if (!confirm('Remove this candidate from your favourites?')) return;

    try {
      await candidatesApi.toggleFavourite(cvId);
      // Reload favourites to update the list
      const favouritesData = await candidatesApi.getFavourites().catch(() => ({ cvs: [] }));
      setFavouriteCandidates(favouritesData.cvs || []);
    } catch (err: any) {
      alert(err.message || 'Failed to remove from favourites');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;

    try {
      await jobsApi.delete(id);
      setJobs(jobs.filter((job) => job._id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete job');
    }
  };

  const handleTogglePublish = async (id: string, currentPublished: boolean) => {
    try {
      const newPublishedStatus = !currentPublished;
      await jobsApi.update(id, { published: newPublishedStatus });
      // Reload jobs to ensure we have the latest state from the server
      await loadJobs();
    } catch (err: any) {
      alert(err.message || 'Failed to update job');
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

  if (authLoading || loading || hasCompany === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  // Redirect to company creation if no company exists
  if (hasCompany === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-12">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-3xl font-bold mb-4 text-gray-900">Company Profile Required</h1>
            <p className="text-gray-600 mb-6">
              Before you can post jobs, you need to create a company profile. This helps job seekers learn more about your organization.
            </p>
            <Link
              href="/recruiter/company/new"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Create Company Profile
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
        <div className="flex flex-wrap justify-between items-center gap-3 mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            {companyName ? `${companyName} Recruiter Dashboard` : 'Recruiter Dashboard'}
          </h1>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/recruiter/jobs/new"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Post New Job
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* My Job Postings Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">My Job Postings</h2>
          {jobs.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600 mb-4">You haven't posted any jobs yet.</p>
              <Link
                href="/recruiter/jobs/new"
                className="text-blue-600 hover:underline font-semibold"
              >
                Post your first job →
              </Link>
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
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Posted
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Visits
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {jobs.map((job) => (
                      <tr key={job._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <Link
                            href={`/jobs/${job._id}`}
                            className="text-blue-600 hover:text-blue-900 hover:underline"
                          >
                            {job.title}
                          </Link>
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
                          {new Date(job.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {job.visitCount || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleTogglePublish(job._id, job.published === true)}
                            className={`mr-4 ${
                              job.published === true
                                ? 'text-orange-600 hover:text-orange-900'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                          >
                            {job.published === true ? 'Unpublish' : 'Publish'}
                          </button>
                          <Link
                            href={`/recruiter/jobs/${job._id}/edit`}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(job._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
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

        {/* ATS - Applications Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Applicant Tracking System</h2>
          {loadingApplications ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600">Loading applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600">No applications received yet.</p>
              <p className="text-gray-500 text-sm mt-2">
                Applications will appear here when candidates apply to your jobs.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {(() => {
                // Group applications by job
                const groupedByJob: { [key: string]: any[] } = {};
                applications.forEach((app: any) => {
                  const jobId = app.jobId?._id || app.jobId;
                  if (!groupedByJob[jobId]) {
                    groupedByJob[jobId] = [];
                  }
                  groupedByJob[jobId].push(app);
                });

                return Object.entries(groupedByJob).map(([jobId, jobApplications]) => {
                  const job = jobApplications[0].jobId;
                  const jobTitle = job?.title || 'Unknown Job';
                  const jobCity = job?.city || '';
                  
                  // Count active applications (exclude withdrawn)
                  const activeApplications = jobApplications.filter((app: any) => app.status !== 'withdrawn');
                  const withdrawnCount = jobApplications.filter((app: any) => app.status === 'withdrawn').length;

                  return (
                    <div key={jobId} className="bg-white rounded-lg shadow-md overflow-hidden">
                      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                        <h3 className="text-xl font-semibold text-gray-900">{jobTitle}</h3>
                        {jobCity && (
                          <p className="text-sm text-gray-600 mt-1">📍 {jobCity}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-1">
                          <span>
                            {activeApplications.length} active {activeApplications.length === 1 ? 'application' : 'applications'}
                          </span>
                          {withdrawnCount > 0 && (
                            <span className="ml-2 text-gray-400">
                              ({withdrawnCount} withdrawn)
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Candidate
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Applied Date
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
                            {jobApplications.map((app: any) => {
                              const candidate = app.candidateId;
                              const candidateName = candidate?.name || 'Unknown';
                              const candidateEmail = candidate?.email || '';
                              const appliedDate = new Date(app.appliedAt).toLocaleDateString();
                              const isWithdrawn = app.status === 'withdrawn';
                              const statusColors: { [key: string]: string } = {
                                new: 'bg-blue-100 text-blue-800',
                                contacted: 'bg-yellow-100 text-yellow-800',
                                interviewed: 'bg-purple-100 text-purple-800',
                                offered: 'bg-green-100 text-green-800',
                                rejected: 'bg-red-100 text-red-800',
                                withdrawn: 'bg-gray-100 text-gray-800',
                              };

                              const getStatusLabel = (status: string) => {
                                if (status === 'withdrawn') {
                                  return 'Withdrawn by candidate';
                                }
                                return status.charAt(0).toUpperCase() + status.slice(1);
                              };

                              return (
                                <tr key={app._id} className={isWithdrawn ? 'opacity-75' : ''}>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <Link
                                      href={`/dashboard/recruiter/applications/${app._id}`}
                                      className={`text-sm font-medium ${isWithdrawn ? 'text-gray-500' : 'text-blue-600 hover:text-blue-800 hover:underline'}`}
                                    >
                                      {candidateName}
                                    </Link>
                                    <div className={`text-sm ${isWithdrawn ? 'text-gray-400' : 'text-gray-500'}`}>{candidateEmail}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div>{appliedDate}</div>
                                    {isWithdrawn && app.withdrawnAt && (
                                      <div className="text-xs text-gray-400 mt-1">
                                        Withdrawn: {new Date(app.withdrawnAt).toLocaleDateString()}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[app.status] || 'bg-gray-100 text-gray-800'}`}>
                                      {getStatusLabel(app.status)}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex flex-col gap-2">
                                      <Link
                                        href={`/dashboard/recruiter/applications/${app._id}`}
                                        className="text-blue-600 hover:text-blue-800 hover:underline"
                                      >
                                        View Details →
                                      </Link>
                                      <select
                                        value={app.status}
                                        onChange={(e) => handleUpdateStatus(app._id, e.target.value)}
                                        disabled={isWithdrawn || updatingStatus === app._id}
                                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <option value="new">New</option>
                                        <option value="contacted">Contacted</option>
                                        <option value="interviewed">Interviewed</option>
                                        <option value="offered">Offered</option>
                                        <option value="rejected">Rejected</option>
                                        <option value="withdrawn">Withdrawn</option>
                                      </select>
                                      {updatingStatus === app._id && (
                                        <span className="text-xs text-gray-500">Updating...</span>
                                      )}
                                      {isWithdrawn && (
                                        <span className="text-xs text-gray-400">Cannot change status</span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>

        {/* My Favorite Candidates Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">My Favorite Candidates</h2>
          {favouriteCandidates.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600">You haven't added any candidates to your favourites yet.</p>
              <p className="text-gray-500 text-sm mt-2">
                Click "Add to Favourites" on any candidate CV to save it here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {favouriteCandidates.map((candidate) => {
                const firstPicture = candidate.pictures && candidate.pictures.length > 0
                  ? candidate.pictures[0]
                  : null;

                return (
                  <div
                    key={candidate._id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {/* Candidate Picture */}
                    <div className="w-full h-48 bg-gray-200 relative overflow-hidden">
                      {firstPicture ? (
                        <img
                          src={firstPicture}
                          alt={candidate.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                          <span className="text-gray-500 text-sm">No Image</span>
                        </div>
                      )}
                    </div>

                    {/* Candidate Info */}
                    <div className="p-4">
                      <Link
                        href={`/candidates/${candidate._id}`}
                        className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600"
                      >
                        {candidate.fullName}
                      </Link>

                      {/* Summary Preview */}
                      {candidate.summary && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {candidate.summary}
                        </p>
                      )}

                      {/* Skills Preview */}
                      {candidate.experienceAndSkill && candidate.experienceAndSkill.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {candidate.experienceAndSkill.slice(0, 3).map((skill, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                            >
                              {skill}
                            </span>
                          ))}
                          {candidate.experienceAndSkill.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                              +{candidate.experienceAndSkill.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Work Areas Preview */}
                      {candidate.lookingForWorkInAreas && candidate.lookingForWorkInAreas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {candidate.lookingForWorkInAreas.slice(0, 2).map((area, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium"
                            >
                              {area}
                            </span>
                          ))}
                          {candidate.lookingForWorkInAreas.length > 2 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                              +{candidate.lookingForWorkInAreas.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Languages Preview */}
                      {candidate.languages && candidate.languages.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {candidate.languages.slice(0, 2).map((lang, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium"
                            >
                              {lang}
                            </span>
                          ))}
                          {candidate.languages.length > 2 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                              +{candidate.languages.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Location */}
                      {candidate.address && (
                        <p className="text-sm text-gray-600 flex items-center gap-1 mb-3">
                          <span>📍</span>
                          <span className="font-medium text-gray-800">{candidate.address}</span>
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-3">
                        <Link
                          href={`/candidates/${candidate._id}`}
                          className="flex-1 text-center bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm font-semibold"
                        >
                          View CV
                        </Link>
                        <button
                          onClick={() => handleRemoveFavourite(candidate._id)}
                          className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 text-sm font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* My Company Section */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">My Company</h2>
            <p className="text-gray-600 mb-4">
              Manage your company profile and information.
            </p>
            <div className="flex gap-4 flex-wrap">
              {companyId && (
                <Link
                  href={`/companies/${companyId}`}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  View Company
                </Link>
              )}
              <Link
                href="/recruiter/company/edit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Edit Company
              </Link>
              <button
                onClick={handleDeleteCompany}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Delete Company
              </button>
            </div>
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
                href="/recruiter/account/edit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Edit Account
              </Link>
              <Link
                href="/recruiter/account/change-password"
                className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
              >
                Change Password
              </Link>
              <Link
                href="/recruiter/account/delete"
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Delete Account
              </Link>
            </div>
          </div>
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

