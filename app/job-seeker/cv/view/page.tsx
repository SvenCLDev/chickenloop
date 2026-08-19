'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import TalentNetworkProfileView from '@/app/components/talentNetwork/TalentNetworkProfileView';
import TalentNetworkVerificationSummary from '@/app/components/talentNetwork/TalentNetworkVerificationSummary';
import { cvApi } from '@/lib/api';
import Link from 'next/link';

const EXPERIENCE_LEVEL_LABELS: Record<string, string> = {
  entry: 'Entry',
  intermediate: 'Intermediate',
  experienced: 'Experienced',
  senior: 'Senior',
};

const AVAILABILITY_LABELS: Record<string, string> = {
  available_now: 'Available now',
  available_soon: 'Available soon',
  seasonal: 'Seasonal',
  not_available: 'Not available',
};

function formatExperienceLevel(value?: string): string {
  if (!value) return '—';
  return EXPERIENCE_LEVEL_LABELS[value] ?? value;
}

function formatAvailability(value?: string): string {
  if (!value) return '—';
  return AVAILABILITY_LABELS[value] ?? value;
}

export default function ViewCVPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cv, setCv] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'job-seeker') {
      router.push(`/${user.role === 'admin' ? 'admin' : 'recruiter'}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && user.role === 'job-seeker') {
      loadCV();
    }
  }, [user]);

  const loadCV = async () => {
    try {
      const data = await cvApi.get();
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
              href="/job-seeker"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const isTalentNetworkV2 = cv.profileSchemaVersion === 2;
  const editHref = isTalentNetworkV2
    ? '/job-seeker/cv/talent-network/edit'
    : '/job-seeker/cv/edit';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {isTalentNetworkV2 ? 'My Talent Network Profile' : 'My CV'}
            </h1>
            <div className="flex gap-3">
              <Link
                href={editHref}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Edit profile
              </Link>
              <Link
                href="/job-seeker"
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>

          {isTalentNetworkV2 && (
            <TalentNetworkVerificationSummary cv={cv} />
          )}

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

          {/* Work preferences */}
          {(cv.lookingForWorkInAreas?.length > 0 ||
            cv.experienceAndSkill?.length > 0 ||
            cv.experienceLevel ||
            cv.availability) && (
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Work Preferences</h2>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Looking for work in these areas:
                    </p>
                    {cv.lookingForWorkInAreas && cv.lookingForWorkInAreas.length > 0 ? (
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
                    ) : (
                      <p className="text-gray-500">—</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Sports & Activities</p>
                    {cv.experienceAndSkill && cv.experienceAndSkill.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {cv.experienceAndSkill.map((item: string, index: number) => (
                          <span
                            key={`sport-${index}`}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">—</p>
                    )}
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Experience Level</p>
                    <p className="text-lg text-gray-900">{formatExperienceLevel(cv.experienceLevel)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Availability</p>
                    <p className="text-lg text-gray-900">{formatAvailability(cv.availability)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isTalentNetworkV2 ? (
            <TalentNetworkProfileView cv={cv} showOwnerStatus />
          ) : (
            <>
          {/* Experience */}
          {cv.experience && cv.experience.length > 0 && (
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Experience</h2>
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
          {cv.skills && cv.skills.some((s: string) => s.trim() !== '') && (
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {cv.skills
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

          </>
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
    </div>
  );
}

