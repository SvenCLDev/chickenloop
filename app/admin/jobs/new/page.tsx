'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { adminApi, apiRequest, jobsApi } from '@/lib/api';
import { compressIncomingJobPhotoFiles } from '@/lib/compressJobImage';
import {
  assertJobJsonPayloadFits,
  JOB_PHOTO_UPLOAD_TOO_LARGE_MESSAGE,
  looksLikePayloadTooLargeError,
  sanitizeJobDescriptionForSubmit,
  validateJobPhotoFilesForUpload,
} from '@/lib/jobPostPayload';
import { sanitizeFileForUpload } from '@/lib/sanitizeFilenameForUpload';
import { stripHtmlToText } from '@/lib/sanitizeText';
import { normalizeCountryForStorage } from '@/lib/countryUtils';
import CreateCompanyForRecruiterModal from '@/components/admin/CreateCompanyForRecruiterModal';
import { OFFICIAL_LANGUAGES } from '@/lib/languages';
import { QUALIFICATIONS } from '@/lib/qualifications';
import { SPORTS_LIST } from '@/lib/sports';
import { JOB_CATEGORIES } from '@/lib/jobCategories';
import UrlInput from '../../../components/form/UrlInput';
import JobDescriptionEditor from '../../../components/form/JobDescriptionEditor';
import Link from 'next/link';

const EXPERIENCE_LEVELS = [
  'internship',
  'junior',
  'senior',
  'expert',
  'manager',
] as const;

type RecruiterOption = { id: string; name: string; email: string; companyName?: string | null };

export default function AdminNewJobPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [recruiterSearch, setRecruiterSearch] = useState('');
  const [recruiterResults, setRecruiterResults] = useState<RecruiterOption[]>([]);
  const [recruiterDropdownOpen, setRecruiterDropdownOpen] = useState(false);
  const [recruiterSearching, setRecruiterSearching] = useState(false);
  const [selectedRecruiter, setSelectedRecruiter] = useState<RecruiterOption | null>(null);
  const [recruiterHasCompany, setRecruiterHasCompany] = useState<boolean | null>(null);
  const recruiterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recruiterContainerRef = useRef<HTMLDivElement>(null);

  const [jobStatus, setJobStatus] = useState<'draft' | 'published'>('draft');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    company: '',
    city: '',
    country: '',
    salary: '',
    type: 'full-time',
    experienceLevel: [] as string[],
    languages: [] as string[],
    qualifications: [] as string[],
    sports: [] as string[],
    occupationalAreas: [] as string[],
    applyViaATS: true,
    applyByEmail: true,
    applyByWebsite: false,
    applyByWhatsApp: false,
    applicationEmail: '',
    applicationWebsite: '',
    applicationWhatsApp: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);
  const [selectedPictures, setSelectedPictures] = useState<File[]>([]);
  const [picturePreviews, setPicturePreviews] = useState<string[]>([]);
  const [uploadingPictures, setUploadingPictures] = useState(false);
  const [optimizingPictures, setOptimizingPictures] = useState(false);
  const [optimizingMessage, setOptimizingMessage] = useState('');
  const [parsingDescription, setParsingDescription] = useState(false);
  const [heroImageIndex, setHeroImageIndex] = useState<number | null>(null);
  const previewCountryCode = normalizeCountryForStorage(formData.country);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'admin') {
      router.push(`/${user.role === 'recruiter' ? 'recruiter' : 'job-seeker'}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (recruiterSearch.trim().length < 2) {
      setRecruiterResults([]);
      setRecruiterDropdownOpen(false);
      return;
    }
    if (recruiterTimeoutRef.current) clearTimeout(recruiterTimeoutRef.current);
    recruiterTimeoutRef.current = setTimeout(async () => {
      setRecruiterSearching(true);
      try {
        const data = await adminApi.getUsers({ search: recruiterSearch.trim(), role: 'recruiter' });
        const list = (data.users || []).map(
          (u: { id: string; name: string; email: string; companyName?: string | null }) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            companyName: u.companyName ?? null,
          })
        );
        setRecruiterResults(list);
        setRecruiterDropdownOpen(list.length > 0);
      } catch {
        setRecruiterResults([]);
      } finally {
        setRecruiterSearching(false);
      }
    }, 300);
    return () => {
      if (recruiterTimeoutRef.current) clearTimeout(recruiterTimeoutRef.current);
    };
  }, [recruiterSearch]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (recruiterContainerRef.current && !recruiterContainerRef.current.contains(e.target as Node)) {
        setRecruiterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!successToast) return;
    const timer = setTimeout(() => setSuccessToast(''), 2500);
    return () => clearTimeout(timer);
  }, [successToast]);

  const loadRecruiterCompanyState = async (recruiterId: string) => {
    try {
      const data = await adminApi.getUser(recruiterId);
      setRecruiterHasCompany(Boolean(data?.user?.companyId));
    } catch {
      setRecruiterHasCompany(null);
    }
  };

  const pickRecruiter = (r: RecruiterOption) => {
    setSelectedRecruiter(r);
    setRecruiterSearch(`${r.name} (${r.email})`);
    setRecruiterDropdownOpen(false);
    setShowCreateCompanyModal(false);
    setFormData((prev) => ({
      ...prev,
      company: (r.companyName && r.companyName.trim()) || prev.company,
      applyByEmail: true,
      applicationEmail: r.email || prev.applicationEmail,
    }));
    void loadRecruiterCompanyState(r.id);
  };

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const files = Array.from(input.files || []);
    input.value = '';

    void (async () => {
      if (files.length + selectedPictures.length > 3) {
        setError('Maximum 3 pictures allowed');
        return;
      }

      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      for (const file of files) {
        if (!validTypes.includes(file.type)) {
          setError(`Invalid file type: ${file.name}. Only images (JPEG, PNG, WEBP, GIF) are allowed.`);
          return;
        }
      }

      setOptimizingPictures(true);
      setOptimizingMessage('Optimizing image…');
      setError('');

      const compressed = await compressIncomingJobPhotoFiles(files, (msg) => setOptimizingMessage(msg));
      if (!compressed.ok) {
        setError(compressed.error);
        setOptimizingPictures(false);
        setOptimizingMessage('');
        return;
      }

      const newPictures = [...selectedPictures, ...compressed.files];
      const uploadErr = validateJobPhotoFilesForUpload(newPictures);
      if (uploadErr) {
        setError(uploadErr);
        setOptimizingPictures(false);
        setOptimizingMessage('');
        return;
      }

      setSelectedPictures(newPictures);
      const newPreviews = compressed.files.map((file) => URL.createObjectURL(file));
      setPicturePreviews((prev) => [...prev, ...newPreviews]);

      if (newPictures.length === 1 && heroImageIndex === null) {
        setHeroImageIndex(0);
      }

      setOptimizingPictures(false);
      setOptimizingMessage('');
    })();
  };

  const handleAutoFillFromDescription = async () => {
    const plain = stripHtmlToText(formData.description).trim();
    if (!plain) {
      setError('Add some description text before using auto-fill.');
      return;
    }
    setParsingDescription(true);
    setError('');
    try {
      const data = (await apiRequest('/ai/parse-job', {
        method: 'POST',
        body: JSON.stringify({ description: plain }),
      })) as {
        employmentType?: string | null;
        language?: string | null;
        experienceLevel?: string[];
        languages?: string[];
        sports?: string[];
        qualifications?: string[];
        occupationalAreas?: string[];
        salary?: string | null;
        city?: string | null;
        country?: string | null;
      };
      const parsedLanguages = Array.isArray(data.languages)
        ? data.languages
        : typeof data.language === 'string' && data.language.trim()
          ? [data.language]
          : [];
      const allowedLanguages = parsedLanguages.filter((lang) =>
        OFFICIAL_LANGUAGES.includes(lang)
      );
      setFormData((prev) => ({
        ...prev,
        ...(data.employmentType != null && data.employmentType !== ''
          ? { type: data.employmentType }
          : {}),
        ...(data.city != null && data.city !== '' ? { city: data.city } : {}),
        ...(data.country != null && data.country !== ''
          ? { country: data.country }
          : {}),
        salary: data.salary != null && data.salary.trim() !== '' ? data.salary : '',
        experienceLevel: Array.isArray(data.experienceLevel)
          ? data.experienceLevel
          : prev.experienceLevel,
        languages: allowedLanguages.length > 0 ? allowedLanguages : ['English'],
        sports: Array.isArray(data.sports) ? data.sports : prev.sports,
        qualifications: Array.isArray(data.qualifications)
          ? data.qualifications
          : prev.qualifications,
        occupationalAreas: Array.isArray(data.occupationalAreas)
          ? data.occupationalAreas
          : prev.occupationalAreas,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Auto-fill failed');
    } finally {
      setParsingDescription(false);
    }
  };

  const removePicture = (index: number) => {
    const newPictures = selectedPictures.filter((_, i) => i !== index);
    const newPreviews = picturePreviews.filter((_, i) => i !== index);
    URL.revokeObjectURL(picturePreviews[index]);
    setSelectedPictures(newPictures);
    setPicturePreviews(newPreviews);
    if (heroImageIndex === index) {
      setHeroImageIndex(newPictures.length > 0 ? 0 : null);
    } else if (heroImageIndex !== null && heroImageIndex > index) {
      setHeroImageIndex(heroImageIndex - 1);
    }
  };

  const uploadPictures = async (): Promise<string[]> => {
    if (selectedPictures.length === 0) return [];

    const preflight = validateJobPhotoFilesForUpload(selectedPictures);
    if (preflight) {
      setError(preflight);
      throw new Error(preflight);
    }

    setUploadingPictures(true);
    try {
      const uploadFormData = new FormData();
      selectedPictures.forEach((file) => {
        uploadFormData.append('pictures', sanitizeFileForUpload(file));
      });

      const response = await fetch('/api/jobs/upload', {
        method: 'POST',
        body: uploadFormData,
        credentials: 'include',
      });

      const text = await response.text();
      if (response.status === 413 || looksLikePayloadTooLargeError(text)) {
        throw new Error(JOB_PHOTO_UPLOAD_TOO_LARGE_MESSAGE);
      }

      let data: { error?: string; paths?: string[] };
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          throw new Error(`Server error: ${text.substring(0, 200)}`);
        }
      } else {
        throw new Error(`Server error: ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload pictures');
      }

      return data.paths || [];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload pictures';
      setError(errorMessage);
      throw error;
    } finally {
      setUploadingPictures(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedRecruiter) {
      setError('Please select a recruiter.');
      return;
    }
    if (recruiterHasCompany === false) {
      setError('Selected recruiter has no company assigned. Create one first.');
      return;
    }

    const validationErrors: string[] = [];
    if (!formData.title?.trim()) validationErrors.push('Job Title is required');
    if (!formData.description?.trim()) validationErrors.push('Description is required');
    if (!formData.company?.trim()) validationErrors.push('Company is required');
    if (!formData.city?.trim()) validationErrors.push('City is required');
    if (!formData.country?.trim()) validationErrors.push('Country is required');
    if (!formData.type?.trim()) validationErrors.push('Employment Type is required');
    if (!formData.occupationalAreas?.length) validationErrors.push('Job Category is required');
    if (!formData.applyViaATS && !formData.applyByEmail && !formData.applyByWebsite && !formData.applyByWhatsApp) {
      validationErrors.push('Please select at least one way for candidates to apply.');
    }

    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      return;
    }

    setLoading(true);

    try {
      const picturePaths = await uploadPictures();
      const normalizedCountry = normalizeCountryForStorage(formData.country);

      const { description: cleanDescription, strippedImageCount } = sanitizeJobDescriptionForSubmit(formData.description);
      if (strippedImageCount > 0) {
        setFormData((prev) => ({ ...prev, description: cleanDescription }));
      }

      const createPayload = {
        ...formData,
        description: cleanDescription,
        company: formData.company.trim(),
        country: normalizedCountry,
        sports: formData.sports,
        languages: formData.languages,
        qualifications: formData.qualifications,
        occupationalAreas: formData.occupationalAreas,
        pictures: picturePaths,
        heroImageIndex: heroImageIndex !== null ? heroImageIndex : undefined,
        recruiterId: selectedRecruiter.id,
        status: jobStatus,
      };

      const sizeError = assertJobJsonPayloadFits(createPayload);
      if (sizeError) {
        setError(sizeError);
        setLoading(false);
        return;
      }

      await jobsApi.create(createPayload);

      picturePreviews.forEach((url) => URL.revokeObjectURL(url));
      setShowSuccessModal(true);
      setTimeout(() => {
        router.push('/admin?section=jobs');
      }, 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create job';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
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
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <Link href="/admin?section=jobs" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
              ← Back to Admin Dashboard
            </Link>
            <h1 className="text-3xl font-bold mb-2 text-gray-900">Create job for recruiter</h1>
            <p className="text-gray-600">Choose a recruiter, then fill in the job details. The job is created under their company account.</p>
          </div>

          {error && (
            <div id="error-banner" className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          {successToast && (
            <div className="bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded mb-4">
              {successToast}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative" ref={recruiterContainerRef}>
              <label htmlFor="recruiter-search" className="block text-sm font-medium text-gray-700 mb-1">
                Recruiter <span className="text-red-500">*</span>
              </label>
              <input
                id="recruiter-search"
                type="text"
                value={recruiterSearch}
                onChange={(e) => {
                  setRecruiterSearch(e.target.value);
                  setSelectedRecruiter(null);
                }}
                onFocus={() => {
                  if (recruiterResults.length > 0) setRecruiterDropdownOpen(true);
                }}
                placeholder="Search by name or email (min. 2 characters)"
                autoComplete="off"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              {recruiterSearching && (
                <p className="text-xs text-gray-500 mt-1" role="status">
                  Searching…
                </p>
              )}
              {recruiterDropdownOpen && recruiterResults.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                  {recruiterResults.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => pickRecruiter(r)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-gray-900"
                      >
                        <span className="font-medium">{r.name}</span>
                        <span className="text-gray-500"> — {r.email}</span>
                        {r.companyName ? (
                          <span className="block text-xs text-gray-600">{r.companyName}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedRecruiter && (
              <p className="text-sm text-gray-600">
                Selected: <span className="font-medium text-gray-900">{selectedRecruiter.name}</span> ({selectedRecruiter.email})
              </p>
            )}
            {selectedRecruiter && recruiterHasCompany === false && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
                <p className="text-amber-900 font-medium">⚠️ No company assigned</p>
                <button
                  type="button"
                  onClick={() => setShowCreateCompanyModal(true)}
                  className="mt-2 inline-flex items-center rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  Create Company
                </button>
              </div>
            )}

            <div>
              <label htmlFor="job-status" className="block text-sm font-medium text-gray-700 mb-1">
                Initial status
              </label>
              <select
                id="job-status"
                value={jobStatus}
                onChange={(e) => setJobStatus(e.target.value as 'draft' | 'published')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              >
                <option value="draft">Draft (not visible on public listings)</option>
                <option value="published">Published</option>
              </select>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Job Title *
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                Company (display name) *
              </label>
              <input
                id="company"
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                required
                placeholder="Prefilled from recruiter when available"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description <span className="text-red-500">*</span>
              </label>
              <JobDescriptionEditor
                id="description"
                label=""
                value={formData.description}
                onChange={(html: string) => setFormData({ ...formData, description: html })}
                className="mt-0"
              />
            </div>

            <div>
              <label htmlFor="pictures" className="block text-sm font-medium text-gray-700 mb-1">
                Pictures (up to 3)
              </label>
              <div className="relative">
                <input
                  id="pictures"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handlePictureChange}
                  disabled={selectedPictures.length >= 3 || optimizingPictures}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                />
                {selectedPictures.length >= 3 ? (
                  <div className="block w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-center bg-gray-100 text-gray-400">
                    Image limit reached (3 of 3)
                  </div>
                ) : (
                  <label
                    htmlFor="pictures"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-center cursor-pointer transition-colors bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                  >
                    {selectedPictures.length === 0 ? 'Choose images (up to 3)' : 'Choose another image'}
                  </label>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Maximum 3 pictures. Images are optimized in the browser before upload.
              </p>
              {optimizingPictures && (
                <p className="text-sm text-blue-700 mt-2" role="status" aria-live="polite">
                  {optimizingMessage || 'Optimizing image…'}
                </p>
              )}
              {selectedPictures.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Header image</label>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {picturePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className={`w-full h-32 object-cover rounded-lg border-2 ${
                            heroImageIndex === index ? 'border-blue-600 ring-2 ring-blue-300' : 'border-gray-300'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => removePicture(index)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold"
                          aria-label="Remove picture"
                        >
                          ×
                        </button>
                        <div className="absolute bottom-1 left-1 right-1">
                          <label className="flex items-center justify-center bg-white/90 rounded px-2 py-1 cursor-pointer hover:bg-white transition-colors">
                            <input
                              type="radio"
                              name="heroImage"
                              checked={heroImageIndex === index}
                              onChange={() => setHeroImageIndex(index)}
                              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="text-xs font-medium text-gray-700">
                              {heroImageIndex === index ? 'Header image' : 'Set as header'}
                            </span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedPictures.length === 0 && (
                <p className="text-sm text-red-600 mt-2 font-medium">
                  Job posts without picture will be less visible and shown below posts with pictures
                </p>
              )}
              <button
                type="button"
                onClick={() => void handleAutoFillFromDescription()}
                disabled={
                  parsingDescription ||
                  !stripHtmlToText(formData.description).trim()
                }
                className="mt-4 w-full sm:w-auto rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {parsingDescription ? 'Filling…' : '✨ Auto-fill from description'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  id="city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                  Country <span className="text-red-500">*</span>
                </label>
                <input
                  id="country"
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="e.g., United States"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                {formData.country && previewCountryCode && (
                  <p className="text-xs text-gray-500 mt-1">Detected ISO: {previewCountryCode}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Employment Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="freelance">Freelance</option>
                </select>
              </div>
              <div>
                <label htmlFor="salary" className="block text-sm font-medium text-gray-700 mb-1">
                  Salary
                </label>
                <input
                  id="salary"
                  type="text"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  placeholder="e.g., $50,000 - $70,000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="occupationalAreas" className="block text-sm font-medium text-gray-700 mb-2">
                  Job Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="occupationalAreas"
                  value={formData.occupationalAreas[0] || ''}
                  onChange={(e) => {
                    const selectedCategory = e.target.value;
                    setFormData({
                      ...formData,
                      occupationalAreas: selectedCategory ? [selectedCategory] : [],
                    });
                  }}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="">Select a category</option>
                  {JOB_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
                  {formData.experienceLevel.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {formData.experienceLevel.map((level) => (
                        <span
                          key={level}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                        >
                          {level}
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                experienceLevel: formData.experienceLevel.filter((l) => l !== level),
                              })
                            }
                            className="ml-2 text-purple-600 hover:text-purple-800"
                            aria-label={`Remove ${level}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3 bg-white">
                    {EXPERIENCE_LEVELS.map((level) => {
                      const isSelected = formData.experienceLevel.includes(level);
                      return (
                        <label
                          key={level}
                          className="flex items-center py-2 px-2 rounded hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  experienceLevel: [...formData.experienceLevel, level],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  experienceLevel: formData.experienceLevel.filter((l) => l !== level),
                                });
                              }
                            }}
                            className="mr-3 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-900">{level}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Languages Required</label>
                {formData.languages.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {formData.languages.map((lang) => (
                      <span
                        key={lang}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {lang}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              languages: formData.languages.filter((l) => l !== lang),
                            });
                          }}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                          aria-label={`Remove ${lang}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3 bg-white">
                  {OFFICIAL_LANGUAGES.map((lang) => {
                    const isSelected = formData.languages.includes(lang);
                    return (
                      <label
                        key={lang}
                        className="flex items-center py-2 px-2 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                languages: [...formData.languages, lang],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                languages: formData.languages.filter((l) => l !== lang),
                              });
                            }
                          }}
                          className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-900">{lang}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sport / Activities</label>
                {formData.sports.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {formData.sports.map((sport) => (
                      <span
                        key={sport}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                      >
                        {sport}
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              sports: formData.sports.filter((s) => s !== sport),
                            })
                          }
                          className="ml-2 text-indigo-600 hover:text-indigo-800"
                          aria-label={`Remove ${sport}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="max-h-56 overflow-y-auto border border-gray-300 rounded-md p-3 bg-white">
                  {SPORTS_LIST.map((sport) => (
                    <label
                      key={sport}
                      className="flex items-center py-2 px-2 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.sports.includes(sport)}
                        onChange={() => {
                          const exists = formData.sports.includes(sport);
                          setFormData({
                            ...formData,
                            sports: exists
                              ? formData.sports.filter((s) => s !== sport)
                              : [...formData.sports, sport],
                          });
                        }}
                        className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-900">{sport}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Select any sport or activity that applies (multiple selections allowed).
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Required Qualifications</label>
                {formData.qualifications.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {formData.qualifications.map((qual) => (
                      <span
                        key={qual}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                      >
                        {qual}
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              qualifications: formData.qualifications.filter((q) => q !== qual),
                            })
                          }
                          className="ml-2 text-green-600 hover:text-green-800"
                          aria-label={`Remove ${qual}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md p-3 bg-white">
                  {QUALIFICATIONS.map((category, categoryIndex) => (
                    <div key={categoryIndex} className="mb-4 last:mb-0">
                      <div className="sticky top-0 bg-gray-100 px-2 py-2 mb-2 rounded font-semibold text-sm text-gray-700 border-b border-gray-200">
                        {category.header}
                      </div>
                      {category.items.map((qual) => {
                        const isSelected = formData.qualifications.includes(qual);
                        return (
                          <label
                            key={qual}
                            className="flex items-center py-2 px-2 ml-4 rounded hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                const exists = formData.qualifications.includes(qual);
                                setFormData({
                                  ...formData,
                                  qualifications: exists
                                    ? formData.qualifications.filter((q) => q !== qual)
                                    : [...formData.qualifications, qual],
                                });
                              }}
                              className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-900">{qual}</span>
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {formData.qualifications.length > 0
                    ? `${formData.qualifications.length} qualification(s) selected`
                    : 'Select required qualifications (tap to select)'}
                </p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">How to Apply</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="applyViaATS"
                    checked={formData.applyViaATS}
                    onChange={(e) => setFormData({ ...formData, applyViaATS: e.target.checked })}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="ml-3 flex-1">
                    <label htmlFor="applyViaATS" className="block text-sm font-medium text-gray-700 mb-1">
                      Chickenloop ATS (recommended)
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                      Receive and manage applications in the recruiter dashboard.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="applyByEmail"
                    checked={formData.applyByEmail}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        applyByEmail: e.target.checked,
                        applicationEmail: e.target.checked ? (formData.applicationEmail || selectedRecruiter?.email || '') : '',
                      })
                    }
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="ml-3 flex-1">
                    <label htmlFor="applyByEmail" className="block text-sm font-medium text-gray-700 mb-1">
                      By email
                    </label>
                    {formData.applyByEmail && (
                      <input
                        type="email"
                        value={formData.applicationEmail}
                        onChange={(e) => setFormData({ ...formData, applicationEmail: e.target.value })}
                        placeholder="application@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="applyByWebsite"
                    checked={formData.applyByWebsite}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        applyByWebsite: e.target.checked,
                        applicationWebsite: e.target.checked ? formData.applicationWebsite : '',
                      })
                    }
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="ml-3 flex-1">
                    <label htmlFor="applyByWebsite" className="block text-sm font-medium text-gray-700 mb-1">
                      Via website
                    </label>
                    {formData.applyByWebsite && (
                      <UrlInput
                        label=""
                        name="applicationWebsite"
                        value={formData.applicationWebsite}
                        onChange={(value: string) => setFormData({ ...formData, applicationWebsite: value })}
                        placeholder="example.com/apply"
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="applyByWhatsApp"
                    checked={formData.applyByWhatsApp}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        applyByWhatsApp: e.target.checked,
                        applicationWhatsApp: e.target.checked ? formData.applicationWhatsApp : '',
                      })
                    }
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="ml-3 flex-1">
                    <label htmlFor="applyByWhatsApp" className="block text-sm font-medium text-gray-700 mb-1">
                      By WhatsApp
                    </label>
                    {formData.applyByWhatsApp && (
                      <input
                        type="tel"
                        value={formData.applicationWhatsApp}
                        onChange={(e) => setFormData({ ...formData, applicationWhatsApp: e.target.value })}
                        placeholder="+1234567890"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading || uploadingPictures || optimizingPictures}
                className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {loading || uploadingPictures ? 'Creating…' : 'Create job'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin?section=jobs')}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Job created</h2>
            <p className="text-gray-600">Returning to the jobs list…</p>
          </div>
        </div>
      )}
      <CreateCompanyForRecruiterModal
        isOpen={showCreateCompanyModal}
        recruiter={selectedRecruiter}
        onClose={() => setShowCreateCompanyModal(false)}
        onSuccess={({ companyName }) => {
          setRecruiterHasCompany(true);
          setFormData((prev) => ({ ...prev, company: companyName }));
          setSelectedRecruiter((prev) =>
            prev ? { ...prev, companyName } : prev
          );
          setSuccessToast('Company created and linked');
        }}
      />
    </div>
  );
}
