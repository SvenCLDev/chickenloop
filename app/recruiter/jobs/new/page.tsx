'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { jobsApi, companyApi } from '@/lib/api';
import { OFFICIAL_LANGUAGES } from '@/lib/languages';
import { QUALIFICATIONS } from '@/lib/qualifications';
import {
  getCountryNameFromCode,
  normalizeCountryForStorage,
} from '@/lib/countryUtils';
import { SPORTS_LIST } from '@/lib/sports';
import { JOB_CATEGORIES } from '@/src/constants/jobCategories';
import Link from 'next/link';

export default function NewJobPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
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
  const [company, setCompany] = useState<any>(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [selectedPictures, setSelectedPictures] = useState<File[]>([]);
  const [picturePreviews, setPicturePreviews] = useState<string[]>([]);
  const [uploadingPictures, setUploadingPictures] = useState(false);
  const previewCountryCode = normalizeCountryForStorage(formData.country);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'recruiter') {
      router.push(`/${user.role === 'admin' ? 'admin' : 'job-seeker'}`);
    } else if (user && user.role === 'recruiter') {
      loadCompany();
    }
  }, [user, authLoading, router]);

  const loadCompany = async () => {
    try {
      const data = await companyApi.get();
      setCompany(data.company);
      
      // Preset location and country from company's address if available
      if (data.company?.address) {
        const companyCountryCode = data.company.address.country;
        const companyCountryName = companyCountryCode
          ? getCountryNameFromCode(companyCountryCode)
          : '';
        setFormData(prev => ({
          ...prev,
          city: data.company.address.city || prev.city,
          country: companyCountryName || prev.country,
        }));
      }
      
      // Prefill application email and website from company
      if (data.company) {
        setFormData(prev => ({
          ...prev,
          applicationEmail: data.company.contact?.email || prev.applicationEmail,
          applicationWebsite: data.company.website || prev.applicationWebsite,
        }));
      }
    } catch (err: any) {
      if (err.message.includes('not found')) {
        setCompany(null);
      } else {
        setError(err.message || 'Failed to load company');
      }
    } finally {
      setCompanyLoading(false);
    }
  };

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + selectedPictures.length > 3) {
      setError('Maximum 3 pictures allowed');
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

  const removePicture = (index: number) => {
    const newPictures = selectedPictures.filter((_, i) => i !== index);
    const newPreviews = picturePreviews.filter((_, i) => i !== index);
    
    // Revoke the URL to free memory
    URL.revokeObjectURL(picturePreviews[index]);
    
    setSelectedPictures(newPictures);
    setPicturePreviews(newPreviews);
  };

  const uploadPictures = async (): Promise<string[]> => {
    if (selectedPictures.length === 0) return [];

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

      return data.paths || [];
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
      // Upload pictures first
      const picturePaths = await uploadPictures();

      // Create job with picture paths
      const normalizedCountry = normalizeCountryForStorage(formData.country);

      await jobsApi.create({
        ...formData,
        company: company?.name || '', // Include company name from company object
        country: normalizedCountry,
        sports: formData.sports,
        occupationalAreas: formData.occupationalAreas,
        pictures: picturePaths,
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
      const errorMessage = err.message || 'Failed to create job';
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

  if (authLoading || companyLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-12">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-3xl font-bold mb-4 text-gray-900">Company Profile Required</h1>
            <p className="text-gray-600 mb-6">
              Before you can post jobs, you need to create a company profile.
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
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-900">Post New Job</h1>
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
                value={company.name}
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
                  Enter the country name in English; we will store the ISO code for you.
                </p>
                {formData.country && previewCountryCode && (
                  <p className="text-xs text-gray-500 mt-1">
                    Detected ISO: {previewCountryCode}
                  </p>
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
                  {JOB_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Languages Required
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
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required Qualifications
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
                  disabled={selectedPictures.length >= 3}
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
                    {selectedPictures.length === 0
                      ? 'Choose images (up to 3)'
                      : 'Choose another image'}
                  </label>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Maximum 3 pictures, 5MB each. Supported formats: JPEG, PNG, WEBP, GIF
              </p>
              {selectedPictures.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {picturePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => removePicture(index)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold"
                        aria-label="Remove picture"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm text-red-600 mt-2 font-medium">
                Job posts without picture will be less visible and shown below posts with pictures
              </p>
            </div>

            {/* How to Apply Section */}
            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">How to Apply</h2>
              
              <div className="space-y-4">
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
                {loading ? 'Posting...' : 'Post Job'}
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
              Your Job has been posted successfully
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

