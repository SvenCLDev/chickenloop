'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '../../../../components/Navbar';
import { jobsApi, companyApi } from '@/lib/api';
import { OFFICIAL_LANGUAGES } from '@/lib/languages';
import { QUALIFICATIONS } from '@/lib/qualifications';
import {
  getCountryNameFromCode,
  normalizeCountryForStorage,
} from '@/lib/countryUtils';
import { SPORTS_LIST } from '@/lib/sports';
import { JOB_CATEGORIES } from '@/src/constants/jobCategories';
import UrlInput from '../../../../components/form/UrlInput';

export default function EditJobPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const jobId = (params?.id as string) || '';
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    city: '',
    country: '',
    salary: '',
    type: 'full-time',
    languages: [] as string[],
    qualifications: [] as string[],
    sports: [] as string[],
    occupationalAreas: [] as string[],
    applyViaATS: true,
    applyByEmail: false,
    applyByWebsite: false,
    applyByWhatsApp: false,
    applicationEmail: '',
    applicationWebsite: '',
    applicationWhatsApp: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [company, setCompany] = useState<any>(null);
  const [existingPictures, setExistingPictures] = useState<string[]>([]);
  const [selectedPictures, setSelectedPictures] = useState<File[]>([]);
  const [picturePreviews, setPicturePreviews] = useState<string[]>([]);
  const [uploadingPictures, setUploadingPictures] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [heroImageIndex, setHeroImageIndex] = useState<number | null>(null);
  const previewCountryCode = normalizeCountryForStorage(formData.country);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'recruiter') {
      router.push(`/${user.role === 'admin' ? 'admin' : 'job-seeker'}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && user.role === 'recruiter' && jobId) {
      loadData();
    }
  }, [user, jobId]);

  const loadData = async () => {
    // Load company first, then job (so we can use company's location as fallback)
    let companyData = null;
    try {
      const companyResponse = await companyApi.get();
      companyData = companyResponse.company;
      setCompany(companyData);
    } catch (err: any) {
      // Company might not exist for old jobs, but we'll show the job's company
    }

    // Load job and use company's location as fallback if job doesn't have it
    try {
      const data = await jobsApi.getOne(jobId);
      const job = data.job;

      // Use job's city if available, otherwise fall back to company's city
      const jobCity = job.city || '';
      const fallbackCity = companyData?.address?.city || '';
      const cityToUse = jobCity || fallbackCity;

      const jobCountryCode = (job as any).country;
      const fallbackCountryCode = companyData?.address?.country;
      const jobCountryName = jobCountryCode ? getCountryNameFromCode(jobCountryCode) : '';
      const fallbackCountryName = fallbackCountryCode ? getCountryNameFromCode(fallbackCountryCode) : '';
      const countryToUse = jobCountryName || fallbackCountryName;

      setFormData({
        title: job.title,
        description: job.description,
        city: cityToUse,
        country: countryToUse,
        salary: job.salary || '',
        type: job.type,
        languages: (job as any).languages || [],
        qualifications: (job as any).qualifications || [],
        sports: (job as any).sports || [],
        occupationalAreas: (job as any).occupationalAreas || [],
        applyViaATS: (job as any).applyViaATS !== undefined ? (job as any).applyViaATS : true,
        applyByEmail: (job as any).applyByEmail || false,
        applyByWebsite: (job as any).applyByWebsite || false,
        applyByWhatsApp: (job as any).applyByWhatsApp || false,
        applicationEmail: (job as any).applicationEmail || (companyData?.contact?.email || ''),
        applicationWebsite: (job as any).applicationWebsite || (companyData?.website || ''),
        applicationWhatsApp: (job as any).applicationWhatsApp || '',
      });
      // Load images with hero info
      try {
        const imagesResponse = await fetch(`/api/jobs/${jobId}/images`);
        if (imagesResponse.ok) {
          const imagesData = await imagesResponse.json();
          const imageUrls = imagesData.images?.map((img: any) => img.imageUrl) || [];
          const heroImage = imagesData.images?.find((img: any) => img.isHero === true);
          setExistingPictures(imageUrls);
          setHeroImageUrl(heroImage?.imageUrl || (imageUrls.length > 0 ? imageUrls[0] : null));
        } else {
          // Fallback to job.pictures if images API fails
          setExistingPictures((job as any).pictures || []);
          setHeroImageUrl((job as any).pictures?.[0] || null);
        }
      } catch (err) {
        // Fallback to job.pictures if images API fails
        setExistingPictures((job as any).pictures || []);
        setHeroImageUrl((job as any).pictures?.[0] || null);
      }
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
    const removedUrl = existingPictures[index];
    const newPictures = existingPictures.filter((_, i) => i !== index);
    setExistingPictures(newPictures);
    
    // Update hero image if removed image was hero
    if (heroImageUrl === removedUrl) {
      // If there are remaining images, select the first one as hero
      setHeroImageUrl(newPictures.length > 0 ? newPictures[0] : (selectedPictures.length > 0 ? null : null));
    }
  };

  const removeNewPicture = (index: number) => {
    const newPictures = selectedPictures.filter((_, i) => i !== index);
    const newPreviews = picturePreviews.filter((_, i) => i !== index);

    // Revoke the URL to free memory
    URL.revokeObjectURL(picturePreviews[index]);

    setSelectedPictures(newPictures);
    setPicturePreviews(newPreviews);
    
    // Update hero image index if removed image was hero
    if (heroImageIndex === index) {
      // If there are remaining new images, select the first one as hero
      // Otherwise, keep existing hero or clear
      setHeroImageIndex(newPictures.length > 0 ? 0 : null);
    } else if (heroImageIndex !== null && heroImageIndex > index) {
      // Adjust hero index if an image before it was removed
      setHeroImageIndex(heroImageIndex - 1);
    }
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

      // Safely parse JSON response
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server error: ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload pictures');
      }

      // Merge existing pictures with newly uploaded ones
      return [...existingPictures, ...(data.paths || [])];
    } catch (error: any) {
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

    // Client-side validation for required fields
    const validationErrors: string[] = [];
    if (!formData.title || !formData.title.trim()) {
      validationErrors.push('Job Title is required');
    }
    if (!formData.description || !formData.description.trim()) {
      validationErrors.push('Description is required');
    }
    if (!formData.city || !formData.city.trim()) {
      validationErrors.push('City is required');
    }
    if (!formData.country || !formData.country.trim()) {
      validationErrors.push('Country is required');
    }
    if (!formData.type || !formData.type.trim()) {
      validationErrors.push('Employment Type is required');
    }
    if (!formData.occupationalAreas || formData.occupationalAreas.length === 0) {
      validationErrors.push('Job Category is required');
    }
    
    // Validate at least one application method is selected
    if (!formData.applyViaATS && !formData.applyByEmail && !formData.applyByWebsite && !formData.applyByWhatsApp) {
      validationErrors.push('Please select at least one way for candidates to apply.');
    }

    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      setLoading(false);
      // Scroll to error banner
      setTimeout(() => {
        const errorBanner = document.getElementById('error-banner');
        if (errorBanner) {
          errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
      return;
    }

    setLoading(true);

    try {
      // Upload new pictures first, merge with existing ones
      const allPicturePaths = await uploadPictures();

      // Determine hero image: either existing hero URL or newly uploaded image
      let finalHeroImageUrl: string | undefined;
      if (heroImageUrl) {
        // Hero is an existing image
        finalHeroImageUrl = heroImageUrl;
      } else if (heroImageIndex !== null && selectedPictures.length > 0) {
        // Hero is a newly uploaded image - find it in the uploaded paths
        // New images are appended after existing ones
        const newImageStartIndex = existingPictures.length;
        const heroPathIndex = newImageStartIndex + heroImageIndex;
        if (heroPathIndex < allPicturePaths.length) {
          finalHeroImageUrl = allPicturePaths[heroPathIndex];
        }
      } else if (allPicturePaths.length > 0 && !heroImageUrl && heroImageIndex === null) {
        // No hero selected, use first image as fallback
        finalHeroImageUrl = allPicturePaths[0];
      }

      // Update job with picture paths
      const normalizedCountry = normalizeCountryForStorage(formData.country);

      await jobsApi.update(jobId, {
        ...formData,
        country: normalizedCountry,
        sports: formData.sports,
        pictures: allPicturePaths,
        heroImageUrl: finalHeroImageUrl,
      });

      // Clean up preview URLs
      picturePreviews.forEach(url => URL.revokeObjectURL(url));

      // Show success modal
      setShowSuccessModal(true);

      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/recruiter');
      }, 3000);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update job';
      setError(errorMessage);
      // Scroll to error banner
      setTimeout(() => {
        const errorBanner = document.getElementById('error-banner');
        if (errorBanner) {
          errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
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
          <h1 className="text-3xl font-bold mb-6 text-gray-900">Edit Job</h1>
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
                value={company?.name || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
              />
              <p className="text-sm text-gray-500 mt-1">This is your company profile. To change it, edit your company profile.</p>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Languages Required
              </label>

              {/* Selected Languages Display */}
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

              {/* Languages Checkbox List */}
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
                {JOB_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sport / Activities
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
                Required Qualifications
              </label>

              {/* Selected Qualifications Display */}
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

              {/* Qualifications Checkbox List with Subheaders */}
              <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md p-3 bg-white">
                {QUALIFICATIONS.map((category, categoryIndex) => (
                  <div key={categoryIndex} className="mb-4 last:mb-0">
                    {/* Subheader - Non-selectable */}
                    <div className="sticky top-0 bg-gray-100 px-2 py-2 mb-2 rounded font-semibold text-sm text-gray-700 border-b border-gray-200">
                      {category.header}
                    </div>
                    {/* Qualification Items */}
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
                Pictures (up to 3 total)
              </label>
              {(existingPictures.length > 0 || selectedPictures.length > 0) && (
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Header image
                  </label>
                  <p className="text-xs text-gray-500">
                    This image will be shown as the main image at the top of the job post.
                  </p>
                </div>
              )}
              {existingPictures.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Existing Pictures:</p>
                  <div className="grid grid-cols-3 gap-4">
                    {existingPictures.map((picture, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={picture}
                          alt={`Existing ${index + 1}`}
                          className={`w-full h-32 object-cover rounded-lg border-2 ${
                            heroImageUrl === picture
                              ? 'border-blue-600 ring-2 ring-blue-300'
                              : 'border-gray-300'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingPicture(index)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold"
                          aria-label="Remove picture"
                        >
                          ×
                        </button>
                        <div className="absolute bottom-1 left-1 right-1">
                          <label className="flex items-center justify-center bg-white/90 rounded px-2 py-1 cursor-pointer hover:bg-white transition-colors">
                            <input
                              type="radio"
                              name="heroImageExisting"
                              checked={heroImageUrl === picture}
                              onChange={() => {
                                setHeroImageUrl(picture);
                                setHeroImageIndex(null); // Clear new hero when selecting existing
                              }}
                              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="text-xs font-medium text-gray-700">
                              {heroImageUrl === picture ? 'Header image' : 'Set as header'}
                            </span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="relative">
                <input
                  id="pictures"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handlePictureChange}
                  disabled={existingPictures.length + selectedPictures.length >= 3}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                />
                {existingPictures.length + selectedPictures.length >= 3 ? (
                  <div className="block w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-center bg-gray-100 text-gray-400">
                    Image limit reached (3 of 3)
                  </div>
                ) : (
                  <label
                    htmlFor="pictures"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-center cursor-pointer transition-colors bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                  >
                    {existingPictures.length + selectedPictures.length === 0
                      ? 'Choose images (up to 3)'
                      : 'Choose another image'}
                  </label>
                )}
              </div>
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
                          className={`w-full h-32 object-cover rounded-lg border-2 ${
                            heroImageIndex === index
                              ? 'border-blue-600 ring-2 ring-blue-300'
                              : 'border-gray-300'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => removeNewPicture(index)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold"
                          aria-label="Remove picture"
                        >
                          ×
                        </button>
                        <div className="absolute bottom-1 left-1 right-1">
                          <label className="flex items-center justify-center bg-white/90 rounded px-2 py-1 cursor-pointer hover:bg-white transition-colors">
                            <input
                              type="radio"
                              name="heroImageNew"
                              checked={heroImageIndex === index}
                              onChange={() => {
                                setHeroImageIndex(index);
                                setHeroImageUrl(null); // Clear existing hero when selecting new
                              }}
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
              {existingPictures.length + selectedPictures.length === 0 && (
                <p className="text-sm text-red-600 mt-2 font-medium">
                  Job posts without picture will be less visible and shown below posts with pictures
                </p>
              )}
            </div>

            {/* How to Apply Section */}
            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">How to Apply</h2>

              {/* Application method validation error */}
              {error && error.includes('Please select at least one way for candidates to apply') && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">
                    Please select at least one way for candidates to apply.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {/* Chickenloop ATS Checkbox */}
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="applyViaATS"
                    checked={formData.applyViaATS}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        applyViaATS: e.target.checked,
                      });
                    }}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="ml-3 flex-1">
                    <label htmlFor="applyViaATS" className="block text-sm font-medium text-gray-700 mb-1">
                      Chickenloop ATS (recommended)
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                      The Chickenloop Application Tracking System lets you receive and manage applications directly in your dashboard. Applicants can apply instantly, increasing response rates.
                    </p>
                  </div>
                </div>

                {/* Warning when ATS is disabled */}
                {!formData.applyViaATS && (
                  <div className="ml-7 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800 mb-1">
                          Disabling the Chickenloop ATS means:
                        </p>
                        <ul className="text-sm text-amber-700 space-y-0.5 list-disc list-inside">
                          <li>Job seekers cannot apply instantly</li>
                          <li>Applications will not appear in your dashboard</li>
                          <li>You will not be able to track candidates</li>
                        </ul>
                        <p className="text-sm text-amber-800 mt-2 font-medium">
                          We strongly recommend keeping ATS enabled.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* By Email Checkbox */}
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="applyByEmail"
                    checked={formData.applyByEmail}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        applyByEmail: e.target.checked,
                        applicationEmail: e.target.checked ? (formData.applicationEmail || company?.contact?.email || '') : '',
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

                {/* Via Website Checkbox */}
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="applyByWebsite"
                    checked={formData.applyByWebsite}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        applyByWebsite: e.target.checked,
                        applicationWebsite: e.target.checked ? (formData.applicationWebsite || company?.website || '') : '',
                      });
                    }}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="ml-3 flex-1">
                    <label htmlFor="applyByWebsite" className="block text-sm font-medium text-gray-700 mb-1">
                      Via our Website
                    </label>
                    {formData.applyByWebsite && (
                      <UrlInput
                        label=""
                        name="applicationWebsite"
                        value={formData.applicationWebsite}
                        onChange={(value) => setFormData({ ...formData, applicationWebsite: value })}
                        placeholder="example.com/apply"
                      />
                    )}
                  </div>
                </div>

                {/* By WhatsApp Checkbox */}
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="applyByWhatsApp"
                    checked={formData.applyByWhatsApp}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        applyByWhatsApp: e.target.checked,
                        applicationWhatsApp: e.target.checked ? (formData.applicationWhatsApp || '') : '',
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

            {/* Error banner near submit button */}
            {error && (
              <div id="error-banner" className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <div className="flex items-center justify-between">
                  <span>{error}</span>
                  <button
                    onClick={() => setError('')}
                    className="text-red-700 hover:text-red-900 ml-4"
                    aria-label="Dismiss error"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {loading ? 'Updating...' : 'Update Job'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 font-semibold"
              >
                Cancel
              </button>
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
                  // Keep the image element but it won't display if file doesn't exist
                }}
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              The job posting has been updated successfully
            </h2>
            <p className="text-gray-600 mb-4">
              Redirecting to your dashboard...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

