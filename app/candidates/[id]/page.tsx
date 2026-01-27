'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../contexts/AuthContext';
import { candidatesApi } from '@/lib/api';
import Link from 'next/link';
import JobSelectionModal from '../../components/JobSelectionModal';

interface CV {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  summary?: string;
  experience: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate?: string;
    description?: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate?: string;
  }>;
  skills: string[];
  certifications?: string[];
  professionalCertifications?: string[];
  experienceAndSkill?: string[];
  languages?: string[];
  lookingForWorkInAreas?: string[];
  pictures?: string[];
  jobSeeker: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export default function CVDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const cvId = params?.id as string;
  const returnUrl = searchParams?.get('returnUrl') || '/candidates';
  const [cv, setCv] = useState<CV | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const [togglingFavourite, setTogglingFavourite] = useState(false);
  const [checkingFavourite, setCheckingFavourite] = useState(false);
  const [hasContacted, setHasContacted] = useState(false);
  const [contacting, setContacting] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [showContactSuccessModal, setShowContactSuccessModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'recruiter' && user.role !== 'admin') {
      router.push(`/${user.role === 'job-seeker' ? 'job-seeker' : ''}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && (user.role === 'recruiter' || user.role === 'admin') && cvId) {
      loadCV();
      checkFavouriteStatus();
      checkContactStatus();
    }
  }, [user, cvId]);

  const checkContactStatus = async () => {
    if (!user || (user.role !== 'recruiter' && user.role !== 'admin') || !cv) return;
    
    try {
      const response = await fetch('/api/applications', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        const candidateId = cv.jobSeeker?._id ? String(cv.jobSeeker._id) : null;
        if (candidateId) {
          const hasContact = (data.applications || []).some((app: any) => {
            // Handle both populated object and ObjectId formats
            let appCandidateId: string | null = null;
            if (app.candidateId) {
              if (typeof app.candidateId === 'object' && app.candidateId._id) {
                appCandidateId = String(app.candidateId._id);
              } else {
                appCandidateId = String(app.candidateId);
              }
            }
            return appCandidateId === candidateId;
          });
          setHasContacted(hasContact);
        }
      }
    } catch (err: any) {
      // Silently fail - not critical
    }
  };

  useEffect(() => {
    if (cv && user && (user.role === 'recruiter' || user.role === 'admin')) {
      checkContactStatus();
    }
  }, [cv, user]);

  const handleContactCandidate = async (jobId?: string) => {
    if (!cv || !user || (user.role !== 'recruiter' && user.role !== 'admin') || contacting || hasContacted) return;
    
    const candidateId = cv.jobSeeker?._id ? String(cv.jobSeeker._id) : null;
    if (!candidateId) {
      alert('Unable to identify candidate. Please try again.');
      return;
    }
    
    setContacting(true);
    
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ candidateId, jobId }),
      });

      const data = await response.json();

      if (response.ok) {
        setHasContacted(true);
        setShowContactSuccessModal(true);
        setShowJobModal(false);
        setAvailableJobs([]);
      } else if (data.jobs && Array.isArray(data.jobs)) {
        // Multiple jobs available - show selection modal
        setAvailableJobs(data.jobs);
        setShowJobModal(true);
        setContacting(false);
      } else {
        alert(data.error || 'Failed to contact candidate. Please try again.');
      }
    } catch (err: any) {
      alert('Failed to contact candidate. Please try again.');
    } finally {
      if (!showJobModal) {
        setContacting(false);
      }
    }
  };

  const handleJobSelect = (jobId: string) => {
    handleContactCandidate(jobId);
  };

  const checkFavouriteStatus = async () => {
    if (!user || (user.role !== 'recruiter' && user.role !== 'admin')) return;
    
    setCheckingFavourite(true);
    try {
      const data = await candidatesApi.checkFavourite(cvId);
      setIsFavourite(data.isFavourite);
    } catch (err: any) {
      // Silently fail - not critical
    } finally {
      setCheckingFavourite(false);
    }
  };

  const handleToggleFavourite = async () => {
    if (!user || (user.role !== 'recruiter' && user.role !== 'admin') || togglingFavourite) return;
    
    setTogglingFavourite(true);
    try {
      const data = await candidatesApi.toggleFavourite(cvId);
      setIsFavourite(data.isFavourite);
    } catch (err: any) {
      alert(err.message || 'Failed to update favourites. Please try again.');
    } finally {
      setTogglingFavourite(false);
    }
  };

  const loadCV = async () => {
    try {
      const response = await fetch(`/api/candidates-list/${cvId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load CV');
      }

      const data = await response.json();
      setCv(data.cv);
    } catch (err: any) {
      setError(err.message || 'Failed to load CV');
    } finally {
      setLoading(false);
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

  if (error || !cv) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error || 'CV not found'}
            </div>
            <Link
              href={returnUrl}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-semibold"
            >
              ← Back to {returnUrl.includes('/applications/') ? 'Application Details' : 'CVs'}
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
          href={returnUrl}
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6 font-semibold"
        >
          ← Back to {returnUrl.includes('/applications/') ? 'Application Details' : 'CVs'}
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{cv.fullName}</h1>
            <div className="flex gap-3">
              {user && (user.role === 'recruiter' || user.role === 'admin') && (
                <>
                  {hasContacted ? (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded font-semibold">
                      <span>✓</span>
                      <span>Contacted</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleContactCandidate()}
                      disabled={contacting}
                      className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {contacting ? 'Contacting...' : 'Contact Candidate'}
                    </button>
                  )}
                  <button
                    onClick={handleToggleFavourite}
                    disabled={togglingFavourite || checkingFavourite}
                    className={`px-4 py-2 rounded font-semibold transition-colors ${
                      isFavourite
                        ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {togglingFavourite
                      ? 'Updating...'
                      : isFavourite
                      ? '★ My Favourite'
                      : '☆ Add to Favourites'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Personal Information */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Personal Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Full Name</p>
                <p className="text-lg text-gray-900">{cv.fullName || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="text-lg text-gray-900">{cv.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Phone</p>
                <p className="text-lg text-gray-900">{cv.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Address</p>
                <p className="text-lg text-gray-900">{cv.address || '-'}</p>
              </div>
            </div>
          </div>

          {/* Summary */}
          {cv.summary && (
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Summary</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{cv.summary}</p>
            </div>
          )}

          {/* Looking for work in these areas */}
          {cv.lookingForWorkInAreas && cv.lookingForWorkInAreas.length > 0 && (
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Looking for work in these areas:</h2>
              <div className="flex flex-wrap gap-2">
                {cv.lookingForWorkInAreas.map((area: string, index: number) => (
                  <span
                    key={`area-${index}`}
                    className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Experience */}
          {cv.experience && cv.experience.length > 0 && (
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Work Experiences</h2>
              <div className="space-y-4">
                {cv.experience.map((exp: any, index: number) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{exp.position}</h3>
                        <p className="text-gray-600">{exp.company}</p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {exp.startDate && exp.endDate
                          ? `${exp.startDate} - ${exp.endDate}`
                          : exp.startDate
                            ? `Since ${exp.startDate}`
                            : '-'}
                      </div>
                    </div>
                    {exp.description && (
                      <p className="text-gray-700 mt-2 whitespace-pre-wrap">{exp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {cv.education && cv.education.length > 0 && (
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Education</h2>
              <div className="space-y-4">
                {cv.education.map((edu: any, index: number) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{edu.degree}</h3>
                        <p className="text-gray-600">{edu.institution}</p>
                        {edu.field && <p className="text-sm text-gray-500 mt-1">{edu.field}</p>}
                      </div>
                      <div className="text-sm text-gray-500">
                        {edu.startDate && edu.endDate
                          ? `${edu.startDate} - ${edu.endDate}`
                          : edu.startDate
                            ? `Since ${edu.startDate}`
                            : '-'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {((cv.skills && cv.skills.length > 0 && cv.skills.some((s: string) => s.trim() !== '')) ||
            (cv.experienceAndSkill && cv.experienceAndSkill.length > 0)) && (
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {/* Sports Experiences and Skills */}
                  {cv.experienceAndSkill &&
                    cv.experienceAndSkill.length > 0 &&
                    cv.experienceAndSkill.map((item: string, index: number) => (
                      <span
                        key={`sport-${index}`}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                      >
                        {item}
                      </span>
                    ))}
                  {/* Other Skills */}
                  {cv.skills &&
                    cv.skills
                      .filter((skill: string) => skill.trim() !== '')
                      .map((skill: string, index: number) => (
                        <span
                          key={`skill-${index}`}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                </div>
              </div>
            )}

          {/* Languages */}
          {cv.languages && cv.languages.length > 0 && (
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Languages</h2>
              <div className="flex flex-wrap gap-2">
                {cv.languages.map((lang: string, index: number) => (
                  <span
                    key={`lang-${index}`}
                    className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {((cv.certifications &&
            cv.certifications.length > 0 &&
            cv.certifications.some((c: string) => c.trim() !== '')) ||
            (cv.professionalCertifications && cv.professionalCertifications.length > 0)) && (
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Certifications</h2>
                <div className="flex flex-wrap gap-2">
                  {/* Professional Certifications */}
                  {cv.professionalCertifications &&
                    cv.professionalCertifications.length > 0 &&
                    cv.professionalCertifications.map((cert: string, index: number) => (
                      <span
                        key={`professional-${index}`}
                        className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                      >
                        {cert}
                      </span>
                    ))}
                  {/* Other Certifications */}
                  {cv.certifications &&
                    cv.certifications
                      .filter((cert: string) => cert.trim() !== '')
                      .map((cert: string, index: number) => (
                        <span
                          key={`other-${index}`}
                          className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                        >
                          {cert}
                        </span>
                      ))}
                </div>
              </div>
            )}

          {/* Pictures */}
          {cv.pictures && cv.pictures.length > 0 && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Pictures</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {cv.pictures.map((picture: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => {
                      setLightboxIndex(index);
                      setIsLightboxOpen(true);
                    }}
                    className="w-full h-64 overflow-hidden rounded-lg border border-gray-300 p-0 hover:opacity-90 transition-opacity"
                    type="button"
                  >
                    <img
                      src={picture}
                      alt={`CV picture ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lightbox */}
          {isLightboxOpen && cv?.pictures && cv.pictures.length > 0 && (
            <div
              className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
              onClick={() => setIsLightboxOpen(false)}
            >
              <div
                className="relative max-w-3xl w-full mx-auto"
                onClick={(event) => event.stopPropagation()}
              >
                <img
                  src={cv.pictures[lightboxIndex]}
                  alt={`CV picture ${lightboxIndex + 1}`}
                  className="w-full h-[70vh] object-contain bg-black"
                />
                {cv.pictures && cv.pictures.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxIndex((prev) =>
                          prev === 0 ? (cv.pictures?.length ?? 1) - 1 : prev - 1
                        )
                      }
                      className="absolute top-1/2 -translate-y-1/2 left-2 bg-white/80 text-gray-900 rounded-full p-2 hover:bg-white transition-colors"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxIndex((prev) =>
                          prev === (cv.pictures?.length ?? 1) - 1 ? 0 : prev + 1
                        )
                      }
                      className="absolute top-1/2 -translate-y-1/2 right-2 bg-white/80 text-gray-900 rounded-full p-2 hover:bg-white transition-colors"
                    >
                      ›
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(false)}
                  className="absolute top-2 right-2 bg-white/80 text-gray-900 rounded-full p-2 hover:bg-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <JobSelectionModal
        isOpen={showJobModal}
        jobs={availableJobs}
        onSelect={handleJobSelect}
        onClose={() => {
          setShowJobModal(false);
          setAvailableJobs([]);
          setContacting(false);
        }}
        candidateName={cv?.fullName}
      />

      {/* Contact Success Modal */}
      {showContactSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="mb-4 flex justify-center items-center" style={{ minHeight: '200px' }}>
              <img
                src="/success-chicken.gif"
                alt="Success"
                className="max-w-xs w-auto h-auto"
                style={{ maxHeight: '300px', display: 'block', objectFit: 'contain' }}
                onError={(e) => {
                  console.error('Failed to load success GIF:', e);
                }}
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Candidate contacted
            </h2>
            <p className="text-gray-600 mb-6">
              Chickenloop has sent an email to this candidate letting them know that you are interested in their profile.
              The candidate has been invited to contact you directly or submit an application.
            </p>
            <button
              onClick={() => setShowContactSuccessModal(false)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

