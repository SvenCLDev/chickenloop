'use client';
// Force Vercel rebuild

import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CV {
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

// Helper function to format time ago
function getTimeAgo(date: string): string {
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

// Component to handle time ago display (prevents hydration mismatch)
function TimeAgoDisplay({ date }: { date: string }) {
  const [timeAgo, setTimeAgo] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTimeAgo(getTimeAgo(date));

    // Update every minute
    const interval = setInterval(() => {
      setTimeAgo(getTimeAgo(date));
    }, 60000);

    return () => clearInterval(interval);
  }, [date]);

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return <span className="text-xs text-gray-500">Loading...</span>;
  }

  return <span className="text-xs text-gray-500">{timeAgo}</span>;
}

export default function CVsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cvs, setCvs] = useState<CV[]>([]);
  const [allCvs, setAllCvs] = useState<CV[]>([]); // Store all CVs for filtering
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [selectedWorkArea, setSelectedWorkArea] = useState<string>('');
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [selectedCertification, setSelectedCertification] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'recruiter' && user.role !== 'admin') {
      router.push(`/${user.role === 'job-seeker' ? 'job-seeker' : ''}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && (user.role === 'recruiter' || user.role === 'admin')) {
      loadCVs();
    }
  }, [user]);

  useEffect(() => {
    // Filter CVs when any filter changes
    let filtered = allCvs;

    // Filter by language
    if (selectedLanguage) {
      filtered = filtered.filter((cv) => {
        if (!cv.languages || cv.languages.length === 0) return false;
        return cv.languages.includes(selectedLanguage);
      });
    }

    // Filter by work area
    if (selectedWorkArea) {
      filtered = filtered.filter((cv) => {
        if (!cv.lookingForWorkInAreas || cv.lookingForWorkInAreas.length === 0) return false;
        return cv.lookingForWorkInAreas.includes(selectedWorkArea);
      });
    }

    // Filter by sport/experience
    if (selectedSport) {
      filtered = filtered.filter((cv) => {
        if (!cv.experienceAndSkill || cv.experienceAndSkill.length === 0) return false;
        return cv.experienceAndSkill.includes(selectedSport);
      });
    }

    // Filter by professional certification
    if (selectedCertification) {
      filtered = filtered.filter((cv) => {
        if (!cv.professionalCertifications || cv.professionalCertifications.length === 0) return false;
        return cv.professionalCertifications.includes(selectedCertification);
      });
    }

    setCvs(filtered);
  }, [selectedLanguage, selectedWorkArea, selectedSport, selectedCertification, allCvs]);

  const loadCVs = async () => {
    try {
      const response = await fetch('/api/candidates-list', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load CVs');
      }

      const data = await response.json();
      setAllCvs(data.cvs || []);
      setCvs(data.cvs || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load CVs');
    } finally {
      setLoading(false);
    }
  };

  // Get unique languages from all CVs
  const getUniqueLanguages = (): string[] => {
    const languageSet = new Set<string>();
    
    allCvs.forEach((cv) => {
      if (cv.languages && cv.languages.length > 0) {
        cv.languages.forEach((language) => {
          languageSet.add(language);
        });
      }
    });

    return Array.from(languageSet).sort();
  };

  // Get unique work areas from all CVs
  const getUniqueWorkAreas = (): string[] => {
    const workAreaSet = new Set<string>();
    
    allCvs.forEach((cv) => {
      if (cv.lookingForWorkInAreas && cv.lookingForWorkInAreas.length > 0) {
        cv.lookingForWorkInAreas.forEach((area) => {
          workAreaSet.add(area);
        });
      }
    });

    return Array.from(workAreaSet).sort();
  };

  // Get unique sports/experiences from all CVs
  const getUniqueSports = (): string[] => {
    const sportSet = new Set<string>();
    
    allCvs.forEach((cv) => {
      if (cv.experienceAndSkill && cv.experienceAndSkill.length > 0) {
        cv.experienceAndSkill.forEach((sport) => {
          sportSet.add(sport);
        });
      }
    });

    return Array.from(sportSet).sort();
  };

  // Get unique professional certifications from all CVs
  const getUniqueCertifications = (): string[] => {
    const certSet = new Set<string>();
    
    allCvs.forEach((cv) => {
      if (cv.professionalCertifications && cv.professionalCertifications.length > 0) {
        cv.professionalCertifications.forEach((cert) => {
          certSet.add(cert);
        });
      }
    });

    return Array.from(certSet).sort();
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
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Job Candidates</h1>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center sm:justify-end mb-8 gap-3 flex-wrap">
            {/* Language Filter */}
            <select
              id="language-filter"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white min-w-[200px]"
            >
              <option value="">All Languages</option>
              {getUniqueLanguages().map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>

            {/* Work Area Filter */}
            <select
              id="workarea-filter"
              value={selectedWorkArea}
              onChange={(e) => setSelectedWorkArea(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white min-w-[200px]"
            >
              <option value="">All Work Areas</option>
              {getUniqueWorkAreas().map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>

            {/* Sports Experiences Filter */}
            <select
              id="sport-filter"
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white min-w-[200px]"
            >
              <option value="">All Sports</option>
              {getUniqueSports().map((sport) => (
                <option key={sport} value={sport}>
                  {sport}
                </option>
              ))}
            </select>

            {/* Professional Certifications Filter */}
            <select
              id="certification-filter"
              value={selectedCertification}
              onChange={(e) => setSelectedCertification(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white min-w-[200px]"
            >
              <option value="">All Certifications</option>
              {getUniqueCertifications().map((cert) => (
                <option key={cert} value={cert}>
                  {cert}
                </option>
              ))}
            </select>

            {/* Clear Filters Button */}
            {(selectedLanguage || selectedWorkArea || selectedSport || selectedCertification) && (
              <button
                onClick={() => {
                  setSelectedLanguage('');
                  setSelectedWorkArea('');
                  setSelectedSport('');
                  setSelectedCertification('');
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 underline whitespace-nowrap"
              >
                Clear Filters
              </button>
            )}
          </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {(selectedLanguage || selectedWorkArea || selectedSport || selectedCertification) && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-4">
            Showing candidates
            {selectedLanguage && (
              <span> with language: <strong>{selectedLanguage}</strong></span>
            )}
            {selectedWorkArea && (
              <span>
                {selectedLanguage ? ',' : ''} work area: <strong>{selectedWorkArea}</strong>
              </span>
            )}
            {selectedSport && (
              <span>
                {(selectedLanguage || selectedWorkArea) ? ',' : ''} sports experience: <strong>{selectedSport}</strong>
              </span>
            )}
            {selectedCertification && (
              <span>
                {(selectedLanguage || selectedWorkArea || selectedSport) ? ',' : ''} certification: <strong>{selectedCertification}</strong>
              </span>
            )}
            {' '}({cvs.length} {cvs.length === 1 ? 'candidate' : 'candidates'})
          </div>
        )}

        {cvs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">No CVs available at the moment.</p>
            <p className="text-gray-500 mt-2">Check back later for new candidates!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {cvs.map((cv) => {
              // Get the first picture, or use a placeholder
              const firstPicture = cv.pictures && cv.pictures.length > 0
                ? cv.pictures[0]
                : null;

              // Get user's last online date
              const lastOnlineDate = cv.jobSeeker?.lastOnline;

              return (
                <Link
                  key={cv._id}
                  href={`/candidates/${cv._id}`}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer block"
                >
                  {/* CV Picture */}
                  <div className="w-full h-48 bg-gray-200 relative overflow-hidden">
                    {firstPicture ? (
                      <img
                        src={firstPicture}
                        alt={cv.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                        <span className="text-gray-500 text-sm">No Image</span>
                      </div>
                    )}
                  </div>

                  {/* CV Info */}
                  <div className="p-4">
                    <h2 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                      {cv.fullName}
                    </h2>

                    {/* Summary Preview */}
                    {cv.summary && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {cv.summary}
                      </p>
                    )}

                    {/* Skills Preview */}
                    {cv.experienceAndSkill && cv.experienceAndSkill.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {cv.experienceAndSkill.slice(0, 3).map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                        {cv.experienceAndSkill.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                            +{cv.experienceAndSkill.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Work Areas Preview */}
                    {cv.lookingForWorkInAreas && cv.lookingForWorkInAreas.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {cv.lookingForWorkInAreas.slice(0, 2).map((area, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium"
                          >
                            {area}
                          </span>
                        ))}
                        {cv.lookingForWorkInAreas.length > 2 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                            +{cv.lookingForWorkInAreas.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Languages Preview */}
                    {cv.languages && cv.languages.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {cv.languages.slice(0, 2).map((lang, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium"
                          >
                            {lang}
                          </span>
                        ))}
                        {cv.languages.length > 2 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                            +{cv.languages.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Location and Last Online */}
                    <div className="flex flex-col gap-1 mt-2">
                      {cv.address && (
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <span>📍</span>
                          <span className="font-medium text-gray-800">{cv.address}</span>
                        </p>
                      )}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">Last logged in:</span>
                        {lastOnlineDate ? (
                          <TimeAgoDisplay date={lastOnlineDate} />
                        ) : (
                          <span className="text-xs text-gray-500">Never</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

