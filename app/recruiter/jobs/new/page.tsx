'use client';

import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import JobDescriptionEditor from '../../../components/form/JobDescriptionEditor';
import { useRecruiterNewJob } from './RecruiterNewJobContext';

export default function NewJobPage() {
  const {
    authLoading,
    company,
    companyLoading,
    formData,
    setFormData,
    error,
    setError,
    parsingDescription,
    handleNext,
    handlePictureChange,
    removePicture,
    picturePreviews,
    selectedPictures,
    optimizingPictures,
    optimizingMessage,
    heroImageIndex,
    setHeroImageIndex,
  } = useRecruiterNewJob();

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
            <div
              id="error-banner"
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setError('')}
                  className="text-red-700 hover:text-red-900 shrink-0"
                  aria-label="Dismiss error"
                >
                  ×
                </button>
              </div>
            </div>
          )}
          <div className="space-y-4">
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
              <p className="text-sm text-gray-500 mt-1">
                To change the company name, edit your company profile from the recruiter dashboard.
              </p>
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
                onChange={(html) => setFormData({ ...formData, description: html })}
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
                    {selectedPictures.length === 0
                      ? 'Choose images (up to 3)'
                      : 'Choose another image'}
                  </label>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Maximum 3 pictures. You can pick images up to about 6 MB each; they are optimized in your
                browser before upload (target under ~1 MB each).
              </p>
              {optimizingPictures && (
                <p className="text-sm text-blue-700 mt-2" role="status" aria-live="polite">
                  {optimizingMessage || 'Optimizing image…'}
                </p>
              )}
              {selectedPictures.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Header image
                    </label>
                    <p className="text-xs text-gray-500">
                      This image will be shown as the main image at the top of the job post.
                    </p>
                  </div>
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
            </div>

            <button
              type="button"
              onClick={() => void handleNext()}
              disabled={parsingDescription}
              className="w-full rounded-lg bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-md hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {parsingDescription ? 'Analyzing description…' : 'Next'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
