'use client';

import { useState } from 'react';
import { SPORTS_LIST } from '@/lib/sports';
import { JOB_CATEGORIES } from '@/src/constants/jobCategories';
import { cvApi } from '@/lib/api';
import { sanitizeFileForUpload } from '@/lib/sanitizeFilenameForUpload';
import {
  JOB_PHOTO_UPLOAD_TOO_LARGE_MESSAGE,
  looksLikePayloadTooLargeError,
  validateJobPhotoFilesForUpload,
} from '@/lib/jobPostPayload';
import { serializeTalentNetworkForm } from '@/lib/talentNetwork/serializeForm';
import { getCertificatesMissingDocument } from '@/lib/talentNetwork/certificateVerification';
import { countUnverifiedCompleteExperienceEntries, getExperienceDateRangeErrorsByIndex } from '@/lib/talentNetwork/experienceVerification';
import CertificateBlock from './CertificateBlock';
import CertificateDocumentSaveModal from './CertificateDocumentSaveModal';
import ProfilePhotosSection, { orderProfilePicturesWithMainFirst } from './ProfilePhotosSection';
import SeasonalExperienceBlock from './SeasonalExperienceBlock';
import LanguageSkillBlock from './LanguageSkillBlock';
import WorkLocationBlock from './WorkLocationBlock';
import {
  emptyCertificate,
  emptyLanguageSkill,
  emptySeasonalExperience,
  type TalentNetworkFormState,
} from './formTypes';

interface TalentNetworkCvFormProps {
  initialForm: TalentNetworkFormState;
  initialPictures?: string[];
  mode: 'create' | 'edit';
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  showPublishedToggle?: boolean;
  submitLabel?: string;
}

export default function TalentNetworkCvForm({
  initialForm,
  initialPictures = [],
  mode,
  onSubmit,
  showPublishedToggle = false,
  submitLabel,
}: TalentNetworkCvFormProps) {
  const [formData, setFormData] = useState<TalentNetworkFormState>(() => ({
    ...initialForm,
    verifiedCertificates:
      initialForm.verifiedCertificates.length > 0
        ? initialForm.verifiedCertificates
        : [emptyCertificate()],
    seasonalExperience:
      initialForm.seasonalExperience.length > 0
        ? initialForm.seasonalExperience
        : [emptySeasonalExperience()],
    languageSkills:
      initialForm.languageSkills.length > 0
        ? initialForm.languageSkills
        : [emptyLanguageSkill()],
  }));
  const [existingPictures, setExistingPictures] = useState(initialPictures);
  const [selectedPictures, setSelectedPictures] = useState<File[]>([]);
  const [picturePreviews, setPicturePreviews] = useState<string[]>([]);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(initialPictures[0] ?? null);
  const [heroImageIndex, setHeroImageIndex] = useState<number | null>(null);
  const [uploadingCertIndex, setUploadingCertIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [experienceDateErrors, setExperienceDateErrors] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [certificateSaveModalOpen, setCertificateSaveModalOpen] = useState(false);
  const [certificatesMissingDocument, setCertificatesMissingDocument] = useState<
    { index: number; label: string }[]
  >([]);

  const uploadPictures = async (): Promise<string[]> => {
    if (selectedPictures.length === 0) return existingPictures;

    const preflight = validateJobPhotoFilesForUpload(selectedPictures);
    if (preflight) {
      setError(preflight);
      throw new Error(preflight);
    }

    const uploadFormData = new FormData();
    selectedPictures.forEach((file) => {
      uploadFormData.append('pictures', sanitizeFileForUpload(file));
    });
    const response = await fetch('/api/profile/upload', {
      method: 'POST',
      body: uploadFormData,
      credentials: 'include',
    });
    const text = await response.text();
    if (response.status === 413 || looksLikePayloadTooLargeError(text)) {
      throw new Error(JOB_PHOTO_UPLOAD_TOO_LARGE_MESSAGE);
    }
    let data: { error?: string; paths?: string[] };
    try {
      data = JSON.parse(text) as { error?: string; paths?: string[] };
    } catch {
      throw new Error('Failed to upload pictures');
    }
    if (!response.ok) throw new Error(data.error || 'Failed to upload pictures');
    return [...existingPictures, ...(data.paths || [])];
  };

  const handleCertificateUpload = async (index: number, file: File) => {
    setUploadingCertIndex(index);
    try {
      const { url } = await cvApi.uploadCertificateDocument(file);
      const next = [...formData.verifiedCertificates];
      next[index] = {
        ...next[index],
        documentUrl: url,
        verificationStatus: 'pending_review',
      };
      setFormData({ ...formData, verifiedCertificates: next });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Certificate upload failed');
    } finally {
      setUploadingCertIndex(null);
    }
  };

  const handlePictureError = (message: string) => {
    setError(message);
  };

  const performSave = async () => {
    setLoading(true);
    try {
      const rawPictures = await uploadPictures();
      const pictures = orderProfilePicturesWithMainFirst(
        rawPictures,
        existingPictures.length,
        heroImageUrl,
        heroImageIndex
      );
      const payload = serializeTalentNetworkForm(formData, pictures);
      await onSubmit(payload);
      picturePreviews.forEach((url) => URL.revokeObjectURL(url));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSeasonalExperienceChange = (
    seasonalExperience: TalentNetworkFormState['seasonalExperience']
  ) => {
    setFormData({ ...formData, seasonalExperience });
    if (Object.keys(experienceDateErrors).length > 0) {
      setExperienceDateErrors(getExperienceDateRangeErrorsByIndex(seasonalExperience));
    }
  };

  const continueSaveAfterConfirmations = async () => {
    const unverifiedCount = countUnverifiedCompleteExperienceEntries(formData.seasonalExperience);
    if (unverifiedCount > 0) {
      const proceed = window.confirm(
        `${unverifiedCount} work experience ${unverifiedCount === 1 ? 'entry is' : 'entries are'} not verified.\n\n` +
          'Recruiters trust verified references. Add a manager email so we can confirm your experience, or save anyway as self-reported.\n\n' +
          'Click OK to save anyway, or Cancel to go back and add references.'
      );
      if (!proceed) return;
    }

    await performSave();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setExperienceDateErrors({});

    const dateRangeErrors = getExperienceDateRangeErrorsByIndex(formData.seasonalExperience);
    const firstInvalidIndex = Object.keys(dateRangeErrors)
      .map(Number)
      .sort((a, b) => a - b)[0];
    if (firstInvalidIndex !== undefined) {
      setExperienceDateErrors(dateRangeErrors);
      requestAnimationFrame(() => {
        document
          .getElementById(`experience-entry-${firstInvalidIndex}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }

    const missingDocs = getCertificatesMissingDocument(formData.verifiedCertificates);
    if (missingDocs.length > 0) {
      setCertificatesMissingDocument(missingDocs);
      setCertificateSaveModalOpen(true);
      return;
    }

    await continueSaveAfterConfirmations();
  };

  const handleCertificateModalGoBack = () => {
    setCertificateSaveModalOpen(false);
    const firstIndex = certificatesMissingDocument[0]?.index;
    if (firstIndex !== undefined) {
      requestAnimationFrame(() => {
        document
          .getElementById(`certificate-entry-${firstIndex}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  };

  const handleCertificateModalSave = async () => {
    setCertificateSaveModalOpen(false);
    await continueSaveAfterConfirmations();
  };

  const toggleSport = (sport: string) => {
    const current = formData.experienceAndSkill;
    setFormData({
      ...formData,
      experienceAndSkill: current.includes(sport)
        ? current.filter((s) => s !== sport)
        : [...current, sport],
    });
  };

  const toggleWorkArea = (area: string) => {
    const current = formData.lookingForWorkInAreas;
    setFormData({
      ...formData,
      lookingForWorkInAreas: current.includes(area)
        ? current.filter((a) => a !== area)
        : [...current, area],
    });
  };

  return (
    <>
      <CertificateDocumentSaveModal
        open={certificateSaveModalOpen}
        certificateLabels={certificatesMissingDocument.map((item) => item.label)}
        onGoBack={handleCertificateModalGoBack}
        onSaveSelfReported={handleCertificateModalSave}
      />
      <form onSubmit={handleSubmit} className="space-y-10">
      {error && (
        <div id="error-banner" className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Full name"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
          <input
            type="tel"
            placeholder="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <input
            type="text"
            placeholder="Town / region"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Summary</h2>
        <textarea
          placeholder="Professional summary"
          value={formData.summary}
          onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Work Preferences</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Type of work I&apos;m looking for:</p>
            <div className="flex flex-wrap gap-2">
              {JOB_CATEGORIES.map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleWorkArea(area)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    formData.lookingForWorkInAreas.includes(area)
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Sports & Activities</p>
            <div className="flex flex-wrap gap-2">
              {SPORTS_LIST.map((sport) => (
                <button
                  key={sport}
                  type="button"
                  onClick={() => toggleSport(sport)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    formData.experienceAndSkill.includes(sport)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  {sport}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="experienceLevel" className="block text-sm font-medium text-gray-700 mb-1">
              Experience Level
            </label>
            <select
              id="experienceLevel"
              value={formData.experienceLevel}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  experienceLevel: e.target.value as TalentNetworkFormState['experienceLevel'],
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select experience level</option>
              <option value="entry">Entry</option>
              <option value="intermediate">Intermediate</option>
              <option value="experienced">Experienced</option>
              <option value="senior">Senior</option>
            </select>
          </div>
          <div>
            <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-1">
              Availability
            </label>
            <select
              id="availability"
              value={formData.availability}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  availability: e.target.value as TalentNetworkFormState['availability'],
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select availability</option>
              <option value="available_now">Available now</option>
              <option value="available_soon">Available soon</option>
              <option value="seasonal">Seasonal</option>
              <option value="not_available">Not available</option>
            </select>
          </div>
        </div>
      </section>

      <WorkLocationBlock
        formData={formData}
        onChange={(updates) => setFormData({ ...formData, ...updates })}
      />

      <LanguageSkillBlock
        skills={formData.languageSkills}
        onChange={(languageSkills) => setFormData({ ...formData, languageSkills })}
      />

      <CertificateBlock
        certificates={formData.verifiedCertificates}
        onChange={(verifiedCertificates) => setFormData({ ...formData, verifiedCertificates })}
        onUploadDocument={handleCertificateUpload}
        uploadingIndex={uploadingCertIndex}
      />

      <SeasonalExperienceBlock
        entries={formData.seasonalExperience}
        onChange={handleSeasonalExperienceChange}
        dateRangeErrors={experienceDateErrors}
      />

      <ProfilePhotosSection
        existingPictures={existingPictures}
        onExistingPicturesChange={setExistingPictures}
        selectedPictures={selectedPictures}
        onSelectedPicturesChange={setSelectedPictures}
        picturePreviews={picturePreviews}
        onPicturePreviewsChange={setPicturePreviews}
        heroImageUrl={heroImageUrl}
        onHeroImageUrlChange={setHeroImageUrl}
        heroImageIndex={heroImageIndex}
        onHeroImageIndexChange={setHeroImageIndex}
        onError={handlePictureError}
      />

      {showPublishedToggle && (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.published !== false}
            onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
          />
          <span className="text-sm text-gray-700">Published (visible to recruiters)</span>
        </label>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Saving...' : submitLabel ?? (mode === 'create' ? 'Create Profile' : 'Save Profile')}
      </button>
    </form>
    </>
  );
}
