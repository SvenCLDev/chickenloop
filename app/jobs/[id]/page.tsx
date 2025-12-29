'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Navbar from '../../components/Navbar';
import ShareJobButton from '../../components/ShareJobButton';
import { jobsApi } from '@/lib/api';
import { getCountryNameFromCode } from '@/lib/countryUtils';
import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';

interface CompanyInfo {
  id?: string;
  _id?: string;
  name?: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  website?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
  };
}

interface Job {
  _id: string;
  title: string;
  description: string;
  company: string;
  location: string;
  country?: string;
  salary?: string;
  type: string;
  languages?: string[];
  occupationalAreas?: string[];
  qualifications?: string[];
  pictures?: string[];
  recruiter: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt?: string;
  companyId?: CompanyInfo;
  spam?: 'yes' | 'no';
  applyByEmail?: boolean;
  applyByWebsite?: boolean;
  applyByWhatsApp?: boolean;
  applicationEmail?: string;
  applicationWebsite?: string;
  applicationWhatsApp?: string;
}

// Component to handle date formatting (prevents hydration mismatch)
function FormattedDate({ date }: { date: string }) {
  const [formattedDate, setFormattedDate] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setFormattedDate(
      new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    );
  }, [date]);

  if (!mounted) {
    return <p className="text-sm text-gray-500 mt-1">Posted: Loading...</p>;
  }

  return <p className="text-sm text-gray-500 mt-1">Posted: {formattedDate}</p>;
}

function formatCompanyAddress(address?: CompanyInfo['address']): string | null {
  if (!address) return null;
  const parts: string[] = [];
  if (address.street) parts.push(address.street);
  const cityState = [address.city, address.state].filter(Boolean).join(', ');
  if (cityState) parts.push(cityState);
  if (address.postalCode) parts.push(address.postalCode);
  if (address.country) {
    parts.push(getCountryNameFromCode(address.country));
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

export default function JobDetailPage() {
  const params = useParams();
  const pathname = usePathname();
  const { user } = useAuth();
  const jobId = (params?.id as string) || '';
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [reportingSpam, setReportingSpam] = useState(false);
  const [spamReported, setSpamReported] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const [togglingFavourite, setTogglingFavourite] = useState(false);
  const [checkingFavourite, setCheckingFavourite] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applicationError, setApplicationError] = useState('');
  const [checkingApplication, setCheckingApplication] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const hasLoadedRef = useRef<string | null>(null);

  // Get the current URL for sharing (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
    }
  }, [pathname]);

  useEffect(() => {
    // Load job regardless of authentication status
    // Use ref to prevent double loading in React Strict Mode
    if (jobId && hasLoadedRef.current !== jobId) {
      hasLoadedRef.current = jobId;
      loadJob();
    }
  }, [jobId]);

  useEffect(() => {
    // Check if job is in favourites when user is logged in as job seeker
    if (user && user.role === 'job-seeker' && jobId) {
      checkFavouriteStatus();
      checkApplicationStatus();
    }
  }, [user, jobId]);

  const loadJob = async () => {
    try {
      const data = await jobsApi.getOne(jobId);
      setJob(data.job);
      // Check if job is already flagged as spam
      if (data.job.spam === 'yes') {
        setSpamReported(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load job');
    } finally {
      setLoading(false);
    }
  };

  const checkFavouriteStatus = async () => {
    if (!user || user.role !== 'job-seeker') return;

    setCheckingFavourite(true);
    try {
      const data = await jobsApi.checkFavourite(jobId);
      setIsFavourite(data.isFavourite);
    } catch (err: any) {
      // Silently fail - not critical
    } finally {
      setCheckingFavourite(false);
    }
  };

  const handleToggleFavourite = async () => {
    if (!user || user.role !== 'job-seeker' || togglingFavourite) return;

    setTogglingFavourite(true);
    try {
      const data = await jobsApi.toggleFavourite(jobId);
      setIsFavourite(data.isFavourite);
    } catch (err: any) {
      alert(err.message || 'Failed to update favourites. Please try again.');
    } finally {
      setTogglingFavourite(false);
    }
  };

  const checkApplicationStatus = async () => {
    if (!user || user.role !== 'job-seeker' || !jobId) return;
    
    setCheckingApplication(true);
    try {
      const response = await fetch(`/api/applications?jobId=${jobId}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setHasApplied(data.hasApplied || false);
      }
    } catch (err: any) {
      // Silently fail - not critical
    } finally {
      setCheckingApplication(false);
    }
  };

  const handleApply = async () => {
    if (!job || !user || user.role !== 'job-seeker' || applying || hasApplied) return;
    
    setApplying(true);
    setApplicationError('');
    
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ jobId: jobId }),
      });

      const data = await response.json();

      if (response.ok) {
        setHasApplied(true);
        alert('Application submitted successfully!');
      } else {
        setApplicationError(data.error || 'Failed to submit application. Please try again.');
        alert(data.error || 'Failed to submit application. Please try again.');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to submit application. Please try again.';
      setApplicationError(errorMessage);
      alert(errorMessage);
    } finally {
      setApplying(false);
    }
  };

  const handleReportSpam = async () => {
    if (!job || spamReported) return;

    setReportingSpam(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/report-spam`, {
        method: 'POST',
      });

      if (response.ok) {
        setSpamReported(true);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to report spam. Please try again.');
      }
    } catch (err: any) {
      alert('Failed to report spam. Please try again.');
    } finally {
      setReportingSpam(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Job Not Found</h1>
            <p className="text-gray-600 mb-6">{error || 'The job you are looking for does not exist.'}</p>
            <Link href="/jobs" className="text-blue-600 hover:underline font-semibold">
              Return to Jobs
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/jobs"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6 font-semibold"
        >
          ← Back to Jobs
        </Link>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Job Pictures */}
          {job.pictures && job.pictures.length > 0 && (
            <div className="w-full">
              <div className="relative w-full h-64 bg-gray-200 overflow-hidden">
                <img
                  src={job.pictures[0]}
                  alt={`${job.title} - Featured`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Only hide if it's a local /uploads/ path (won't work on Vercel)
                    const img = e.target as HTMLImageElement;
                    const imageUrl = img.src || (job.pictures && job.pictures[0]) || '';
                    if (imageUrl.includes('/uploads/')) {
                      img.style.display = 'none';
                    } else {
                      // For blob storage URLs, log the error for debugging
                      console.error('Failed to load image from Blob Storage:', imageUrl);
                      // Don't hide - let the browser show the broken image icon so we can debug
                    }
                  }}
                />
              </div>
            </div>
          )}

          <div className="p-8">
            {/* Job Title and Company */}
            <div className="mb-6">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{job.title}</h1>
              <p className="text-2xl text-gray-600 mb-2">{job.company}</p>
              {/* Share and Favourites Buttons */}
              <div className="flex items-center gap-3">
                <ShareJobButton
                  jobTitle={job.title}
                  shortDescription={`${job.type} position at ${job.company} in ${job.location}`}
                  url={currentUrl}
                />
                {/* Add to Favourites Button */}
                {user && user.role === 'job-seeker' ? (
                  <button
                    onClick={handleToggleFavourite}
                    disabled={togglingFavourite || checkingFavourite}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
                  >
                    {togglingFavourite ? (
                      <span>...</span>
                    ) : isFavourite ? (
                      <>
                        <svg className="w-4 h-4 fill-yellow-500" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span>In Favourites</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        <span>Add to Favourites</span>
                      </>
                    )}
                  </button>
                ) : null}
              </div>
            </div>

            {/* Job Details */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center text-gray-600">
                  <span className="mr-2">📍</span>
                  <span>{job.location}</span>
                </div>
                {job.country && typeof job.country === 'string' && job.country.trim() && (
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">🌍</span>
                    <span>{getCountryNameFromCode(job.country)}</span>
                  </div>
                )}
                <div className="flex items-center text-gray-600">
                  <span className="mr-2">💼</span>
                  <span className="capitalize">{job.type.replace('-', ' ')}</span>
                </div>
                {job.salary && (
                  <div className="flex items-center text-gray-700 font-semibold">
                    <span className="mr-2">💰</span>
                    <span>{job.salary}</span>
                  </div>
                )}
              </div>

              {/* Languages Required - in Job Details section */}
              {job.languages && job.languages.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">🌐</span>
                    <span className="font-medium">Languages:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {job.languages.map((language, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                      >
                        {language}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Job Categories - in Job Details section */}
              {job.occupationalAreas && job.occupationalAreas.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">💼</span>
                    <span className="font-medium">Job Category:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {job.occupationalAreas.map((area, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Qualifications - in Job Details section */}
              {job.qualifications && job.qualifications.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">📜</span>
                    <span className="font-medium">Qualifications:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {job.qualifications.map((qualification, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                      >
                        {qualification}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Job Description */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Job Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{job.description}</p>
            </div>

            {job.pictures && job.pictures.length > 0 && (
              <div className="mb-6">
                <div className="grid grid-cols-3 gap-2">
                  {job.pictures.map((picture, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setLightboxIndex(index);
                        setIsLightboxOpen(true);
                      }}
                      className="w-full h-32 overflow-hidden rounded-lg border border-gray-300 p-0"
                      type="button"
                    >
                      <img
                        src={picture}
                        alt={`${job.title} - Image ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Only hide if it's a local /uploads/ path (won't work on Vercel)
                          const img = e.target as HTMLImageElement;
                          if (img.src.includes('/uploads/')) {
                            img.style.display = 'none';
                          } else {
                            // For blob storage URLs, log the error but don't hide
                            console.error('Failed to load image:', img.src);
                          }
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isLightboxOpen && job?.pictures && job.pictures.length > 0 && (
              <div
                className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
                onClick={() => setIsLightboxOpen(false)}
              >
                <div
                  className="relative max-w-3xl w-full mx-auto"
                  onClick={(event) => event.stopPropagation()}
                >
                  <img
                    src={job.pictures[lightboxIndex]}
                    alt={`${job.title} - Image ${lightboxIndex + 1}`}
                    className="w-full h-[70vh] object-contain bg-black"
                    onError={(e) => {
                      // Show error message for broken images
                      const img = e.target as HTMLImageElement;
                      img.style.display = 'none';
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'w-full h-[70vh] flex items-center justify-center bg-black text-white';
                      errorDiv.textContent = 'Image not available';
                      img.parentElement?.appendChild(errorDiv);
                    }}
                  />
                  {job.pictures && job.pictures.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxIndex((prev) =>
                            prev === 0 ? (job.pictures?.length ?? 1) - 1 : prev - 1
                          )
                        }
                        className="absolute top-1/2 -translate-y-1/2 left-2 bg-white/80 text-gray-900 rounded-full p-2"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxIndex((prev) =>
                            prev === (job.pictures?.length ?? 1) - 1 ? 0 : prev + 1
                          )
                        }
                        className="absolute top-1/2 -translate-y-1/2 right-2 bg-white/80 text-gray-900 rounded-full p-2"
                      >
                        ›
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(false)}
                    className="absolute top-2 right-2 bg-white/80 text-gray-900 rounded-full p-2"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {job.companyId && (
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Company Info</h2>
                {job.companyId.description && (
                  <p className="text-gray-700 mb-2">{job.companyId.description}</p>
                )}
                {formatCompanyAddress(job.companyId.address) && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-semibold text-gray-600">Location:</span>{' '}
                    {formatCompanyAddress(job.companyId.address)}
                  </p>
                )}
                {job.companyId.website && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-semibold text-gray-600">Website:</span>{' '}
                    <a
                      href={job.companyId.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {job.companyId.website}
                    </a>
                  </p>
                )}
                {job.companyId && (job.companyId.id || job.companyId._id) && (
                  <div className="mt-4 text-right">
                    <Link
                      href={`/companies/${job.companyId.id || (typeof job.companyId._id === 'string' ? job.companyId._id : String(job.companyId._id))}`}
                      className="inline-block px-4 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
                    >
                      More Company Details
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* How to Apply Section */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">How to Apply</h2>
              
              {/* ATS Apply Button - Show for job seekers */}
              {user && user.role === 'job-seeker' && (
                <div className="mb-4">
                  {hasApplied ? (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium">
                      <span>✓</span>
                      <span>Application Submitted</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleApply}
                      disabled={applying || checkingApplication}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {applying ? 'Submitting Application...' : checkingApplication ? 'Checking...' : 'Instant Application'}
                    </button>
                  )}
                  {applicationError && (
                    <p className="mt-2 text-sm text-red-600">{applicationError}</p>
                  )}
                </div>
              )}

              {/* External Application Methods */}
              {(job.applyByEmail || job.applyByWebsite || job.applyByWhatsApp) && (
                <>
                  {user && user.role === 'job-seeker' && (
                    <p className="text-sm text-gray-600 mb-3">Or apply directly:</p>
                  )}
                  <div className="space-y-3">
                    {job.applyByEmail && job.applicationEmail && (
                      <div className="flex items-center gap-3">
                        <span className="text-lg">📧</span>
                        <div className="flex items-center gap-2 text-gray-600">
                          <span className="font-medium">By email:</span>
                          <a
                            href={`mailto:${job.applicationEmail}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {job.applicationEmail}
                          </a>
                        </div>
                      </div>
                    )}
                    {job.applyByWebsite && job.applicationWebsite && (
                      <div className="flex items-center gap-3">
                        <span className="text-lg">🌐</span>
                        <div className="flex items-center gap-2 text-gray-600">
                          <span className="font-medium">Via our Website:</span>
                          <a
                            href={job.applicationWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {job.applicationWebsite}
                          </a>
                        </div>
                      </div>
                    )}
                    {job.applyByWhatsApp && job.applicationWhatsApp && (
                      <div className="flex items-center gap-3">
                        <span className="text-lg">💬</span>
                        <div className="flex items-center gap-2 text-gray-600">
                          <span className="font-medium">By WhatsApp:</span>
                          <a
                            href={`https://wa.me/${job.applicationWhatsApp.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {job.applicationWhatsApp}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Show message for non-logged-in users or non-job-seekers */}
              {(!user || user.role !== 'job-seeker') && !job.applyByEmail && !job.applyByWebsite && !job.applyByWhatsApp && (
                <p className="text-gray-600">
                  {!user ? (
                    <>
                      Please <Link href="/login" className="text-blue-600 hover:underline">log in</Link> as a job seeker to apply.
                    </>
                  ) : (
                    'Please contact the recruiter directly to apply for this position.'
                  )}
                </p>
              )}

              <p className="mt-4 text-sm text-gray-500 italic">
                Please mention that you found this job on chickenloop.com
              </p>
            </div>

            {/* Posted Info, Favourites, and Report Spam Button - Layout */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                {/* Left Column - Posted Info */}
                <div className="flex-1">
                  <p className="text-sm text-gray-500">
                    Posted by: <span className="font-semibold">{job.recruiter.name}</span>
                  </p>
                  <FormattedDate date={job.createdAt} />
                </div>

                {/* Right Column - Report Spam Button */}
                <div className="flex-shrink-0">
                  {/* Report Spam Button */}
                  <button
                    onClick={handleReportSpam}
                    disabled={reportingSpam || spamReported}
                    className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${spamReported
                        ? 'bg-red-100 text-red-700 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                  >
                    {spamReported ? '✓ Reported as Spam' : reportingSpam ? 'Reporting...' : '🚩 Report as Spam'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


