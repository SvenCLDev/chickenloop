'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '../../../../components/Navbar';
import { adminApi } from '@/lib/api';
import { OFFICIAL_LANGUAGES } from '@/lib/languages';
import { QUALIFICATIONS } from '@/lib/qualifications';
import {
  getCountryNameFromCode,
  normalizeCountryForStorage,
} from '@/lib/countryUtils';
import { SPORTS_LIST } from '@/lib/sports';
import { JOB_CATEGORIES } from '@/src/constants/jobCategories';
import Link from 'next/link';

export default function AdminEditJobPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const jobId = (params?.id as string) || '';
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    country: '',
    salary: '',
    type: 'full-time',
    company: '',
    languages: [] as string[],
    qualifications: [] as string[],
    sports: [] as string[],
    occupationalAreas: [] as string[],
    applyByEmail: false,
    applyByWebsite: false,
    applyByWhatsApp: false,
    applicationEmail: '',
    applicationWebsite: '',
    applicationWhatsApp: '',
    published: true,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [existingPictures, setExistingPictures] = useState<string[]>([]);
  const [selectedPictures, setSelectedPictures] = useState<File[]>([]);
  const [picturePreviews, setPicturePreviews] = useState<string[]>([]);
  const [uploadingPictures, setUploadingPictures] = useState(false);
  const previewCountryCode = normalizeCountryForStorage(formData.country);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'admin') {
      router.push(`/${user.role === 'recruiter' ? 'recruiter' : 'job-seeker'}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && user.role === 'admin' && jobId) {
      loadData();
    }
  }, [user, jobId]);

  const loadData = async () => {
    try {
      const data = await adminApi.getJob(jobId);
      const job = data.job;

      const jobCountryCode = (job as any).country;
      const jobCountryName = jobCountryCode ? getCountryNameFromCode(jobCountryCode) : '';

      setFormData({
        title: job.title || '',
        description: job.description || '',
        location: job.location || '',
        country: jobCountryName,
        salary: job.salary || '',
        type: job.type || 'full-time',
        company: job.company || '',
        languages: (job as any).languages || [],
        qualifications: (job as any).qualifications || [],
        sports: (job as any).sports || [],
        occupationalAreas: (job as any).occupationalAreas || [],
        applyByEmail: (job as any).applyByEmail || false,
        applyByWebsite: (job as any).applyByWebsite || false,
        applyByWhatsApp: (job as any).applyByWhatsApp || false,
        applicationEmail: (job as any).applicationEmail || '',
        applicationWebsite: (job as any).applicationWebsite || '',
        applicationWhatsApp: (job as any).applicationWhatsApp || '',
        published: (job as any).published !== false,
      });
      setExistingPictures((job as any).pictures || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load job');
    } finally {
      setFetching(false);
    }
  };

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalPictures = existingPictures.length + selectedPictures.length + files.length;

    if (totalPictures > 3) {
      setError('Maximum 3 pictures allowed (including existing ones)');
      return;
    }

    // Validate file types and sizes
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        setError(`Invalid file type: ${file.name}. Only images (JPEG, PNG, WEBP, GIF) are allowed.`);
        return;
      }
      if (file.size > maxSize) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const errorMessage = `File "${file.name}" is too large (${fileSizeMB} MB). Maximum size is 5MB.`;
        alert(`Warning: ${errorMessage}`);
        setError(errorMessage);
        return;
      }
    }

    const newPictures = [...selectedPictures, ...files];
    setSelectedPictures(newPictures);
    setError('');

    // Create preview URLs
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPicturePreviews([...picturePreviews, ...newPreviews]);
  };

  const removeExistingPicture = (index: number) => {
    const newPictures = existingPictures.filter((_, i) => i !== index);
    setExistingPictures(newPictures);
  };

  const removeNewPicture = (index: number) => {
    const newPictures = selectedPictures.filter((_, i) => i !== index);
    const newPreviews = picturePreviews.filter((_, i) => i !== index);

    // Revoke the URL to free memory
    URL.revokeObjectURL(picturePreviews[index]);

    setSelectedPictures(newPictures);
    setPicturePreviews(newPreviews);
  };

  const uploadPictures = async (): Promise<string[]> => {
    if (selectedPictures.length === 0) return existingPictures;

    setUploadingPictures(true);
    try {
      const uploadFormData = new FormData();
      selectedPictures.forEach((file) => {
        uploadFormData.append('pictures', file);
      });

      const response = await fetch('/api/jobs/upload', {
        method: 'POST',
        body: uploadFormData,
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload pictures');
      }

      // Merge existing pictures with newly uploaded ones
      return [...existingPictures, ...(data.paths || [])];
    } finally {
      setUploadingPictures(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Upload new pictures first, merge with existing ones
      const allPicturePaths = await uploadPictures();

      // Update job with picture paths
      const normalizedCountry = normalizeCountryForStorage(formData.country);

      await adminApi.updateJob(jobId, {
        ...formData,
        country: normalizedCountry,
        sports: formData.sports,
        pictures: allPicturePaths,
        published: formData.published,
      });

      // Clean up preview URLs
      picturePreviews.forEach(url => URL.revokeObjectURL(url));

      // Show success modal
      setShowSuccessModal(true);

      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/admin');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update job');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || fetching) {
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
            <Link
              href="/admin"
              className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
            >
              ← Back to Admin Dashboard
            </Link>
            <h1 className="text-3xl font-bold mb-2 text-gray-900">Edit Job</h1>
            <p className="text-gray-600">
              Update job information and settings.
            </p>
          </div>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                Company *
              </label>
              <input
                id="company"
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location *
                </label>
                <input
                  id="location"
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  id="country"
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="e.g., United States"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the country name in English; we will store the ISO code automatically.
                </p>
                {formData.country && previewCountryCode && (
                  <p className="text-xs text-gray-500 mt-1">
                    Detected ISO: {previewCountryCode}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Job Type *
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
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            {/* Published Status */}
            <div className="border-t pt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.published}
                  onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Published (visible to job seekers)
                </span>
              </label>
            </div>

            {/* Languages, Qualifications, Sports, Occupational Areas - Same as recruiter version */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Languages Required (Optional)
              </label>

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

              <p className="text-xs text-gray-500 mt-2">
                {formData.languages.length > 0
                  ? `${formData.languages.length} language(s) selected`
                  : 'Select languages (tap to select)'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Category (Optional)
              </label>

              {formData.occupationalAreas.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {formData.occupationalAreas.map((area) => (
                    <span
                      key={area}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                    >
                      {area}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            occupationalAreas: formData.occupationalAreas.filter((a) => a !== area),
                          });
                        }}
                        className="ml-2 text-purple-600 hover:text-purple-800"
                        aria-label={`Remove ${area}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3 bg-white">
                {JOB_CATEGORIES.map((area) => {
                  const isSelected = formData.occupationalAreas.includes(area);
                  return (
                    <label
                      key={area}
                      className="flex items-center py-2 px-2 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              occupationalAreas: [...formData.occupationalAreas, area],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              occupationalAreas: formData.occupationalAreas.filter((a) => a !== area),
                            });
                          }
                        }}
                        className="mr-3 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-900">{area}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">Select job categories that describe this role.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sport / Activities (Optional)
              </label>

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
                        onClick={() => {
                          setFormData({
                            ...formData,
                            sports: formData.sports.filter((s) => s !== sport),
                          });
                        }}
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
                {SPORTS_LIST.map((sport) => {
                  const isSelected = formData.sports.includes(sport);

                  return (
                    <label
                      key={sport}
                      className="flex items-center py-2 px-2 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              sports: [...formData.sports, sport],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              sports: formData.sports.filter((s) => s !== sport),
                            });
                          }
                        }}
                        className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-900">{sport}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Select sport or activity categories (multiple selections allowed).
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Qualifications (Optional)
              </label>

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
                        onClick={() => {
                          setFormData({
                            ...formData,
                            qualifications: formData.qualifications.filter((q) => q !== qual),
                          });
                        }}
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
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  qualifications: [...formData.qualifications, qual],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  qualifications: formData.qualifications.filter((q) => q !== qual),
                                });
                              }
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

            <div>
              <label htmlFor="pictures" className="block text-sm font-medium text-gray-700 mb-1">
                Pictures (Optional - up to 3 total)
              </label>
              {existingPictures.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Existing Pictures:</p>
                  <div className="grid grid-cols-3 gap-4">
                    {existingPictures.map((picture, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={picture}
                          alt={`Existing ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingPicture(index)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold"
                          aria-label="Remove picture"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <input
                id="pictures"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                multiple
                onChange={handlePictureChange}
                disabled={existingPictures.length + selectedPictures.length >= 3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-sm text-gray-500 mt-1">
                Maximum 3 pictures total (including existing ones), 5MB each. Supported formats: JPEG, PNG, WEBP, GIF
              </p>
              {selectedPictures.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">New Pictures:</p>
                  <div className="grid grid-cols-3 gap-4">
                    {picturePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewPicture(index)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold"
                          aria-label="Remove picture"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* How to Apply Section */}
            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">How to Apply</h2>

              <div className="space-y-4">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="applyByEmail"
                    checked={formData.applyByEmail}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        applyByEmail: e.target.checked,
                        applicationEmail: e.target.checked ? formData.applicationEmail : '',
                      });
                    }}
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
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        applyByWebsite: e.target.checked,
                        applicationWebsite: e.target.checked ? formData.applicationWebsite : '',
                      });
                    }}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="ml-3 flex-1">
                    <label htmlFor="applyByWebsite" className="block text-sm font-medium text-gray-700 mb-1">
                      Via our Website
                    </label>
                    {formData.applyByWebsite && (
                      <input
                        type="url"
                        value={formData.applicationWebsite}
                        onChange={(e) => setFormData({ ...formData, applicationWebsite: e.target.value })}
                        placeholder="https://example.com/apply"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="applyByWhatsApp"
                    checked={formData.applyByWhatsApp}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        applyByWhatsApp: e.target.checked,
                        applicationWhatsApp: e.target.checked ? formData.applicationWhatsApp : '',
                      });
                    }}
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

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading || uploadingPictures}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {loading || uploadingPictures ? 'Updating...' : 'Update Job'}
              </button>
              <Link
                href="/admin"
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 font-semibold text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="mb-4 flex justify-center items-center" style={{ minHeight: '200px' }}>
              <img
                src="/success-chicken.gif"
                alt="Success"
                className="max-w-xs w-auto h-auto"
                style={{ maxHeight: '300px', display: 'block', objectFit: 'contain' }}
                onLoad={() => console.log('Success GIF loaded')}
                onError={(e) => {
                  console.error('Failed to load success GIF:', e);
                }}
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              The job posting has been updated successfully
            </h2>
            <p className="text-gray-600 mb-4">
              Redirecting to admin dashboard...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}





