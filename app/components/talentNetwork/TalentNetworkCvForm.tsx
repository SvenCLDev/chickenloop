'use client';

import { useState } from 'react';
import { SPORTS_LIST } from '@/lib/sports';
import { JOB_CATEGORIES } from '@/src/constants/jobCategories';
import { cvApi } from '@/lib/api';
import { sanitizeFileForUpload } from '@/lib/sanitizeFilenameForUpload';
import { serializeTalentNetworkForm } from '@/lib/talentNetwork/serializeForm';
import CertificateBlock from './CertificateBlock';
import SeasonalExperienceBlock from './SeasonalExperienceBlock';
import LanguageSkillBlock from './LanguageSkillBlock';
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
  const [uploadingCertIndex, setUploadingCertIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const uploadPictures = async (): Promise<string[]> => {
    if (selectedPictures.length === 0) return existingPictures;
    const uploadFormData = new FormData();
    selectedPictures.forEach((file) => {
      uploadFormData.append('pictures', sanitizeFileForUpload(file));
    });
    const response = await fetch('/api/cv/upload', {
      method: 'POST',
      body: uploadFormData,
      credentials: 'include',
    });
    const data = await response.json();
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

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (existingPictures.length + selectedPictures.length + files.length > 3) {
      setError('Maximum 3 pictures allowed');
      return;
    }
    setSelectedPictures([...selectedPictures, ...files]);
    setPicturePreviews([...picturePreviews, ...files.map((f) => URL.createObjectURL(f))]);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const pictures = await uploadPictures();
      const payload = serializeTalentNetworkForm(formData, pictures);
      await onSubmit(payload);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
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
    <form onSubmit={handleSubmit} className="space-y-10">
      {error && (
        <div id="error-banner" className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Contact & Summary</h2>
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
        <textarea
          placeholder="Professional summary"
          value={formData.summary}
          onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </section>

      <CertificateBlock
        certificates={formData.verifiedCertificates}
        onChange={(verifiedCertificates) => setFormData({ ...formData, verifiedCertificates })}
        onUploadDocument={handleCertificateUpload}
        uploadingIndex={uploadingCertIndex}
      />

      <SeasonalExperienceBlock
        entries={formData.seasonalExperience}
        onChange={(seasonalExperience) => setFormData({ ...formData, seasonalExperience })}
      />

      <LanguageSkillBlock
        skills={formData.languageSkills}
        onChange={(languageSkills) => setFormData({ ...formData, languageSkills })}
      />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Sports & Activities</h2>
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
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Work Preferences</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {JOB_CATEGORIES.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => toggleWorkArea(area)}
              className={`px-3 py-1 rounded-full text-sm border ${
                formData.lookingForWorkInAreas.includes(area)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              {area}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={formData.experienceLevel}
            onChange={(e) =>
              setFormData({
                ...formData,
                experienceLevel: e.target.value as TalentNetworkFormState['experienceLevel'],
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Experience level</option>
            <option value="entry">Entry</option>
            <option value="intermediate">Intermediate</option>
            <option value="experienced">Experienced</option>
            <option value="senior">Senior</option>
          </select>
          <select
            value={formData.availability}
            onChange={(e) =>
              setFormData({
                ...formData,
                availability: e.target.value as TalentNetworkFormState['availability'],
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Availability</option>
            <option value="available_now">Available now</option>
            <option value="available_soon">Available soon</option>
            <option value="seasonal">Seasonal</option>
            <option value="not_available">Not available</option>
          </select>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Profile Photos</h2>
        <input type="file" accept="image/*" multiple onChange={handlePictureChange} />
        <div className="flex flex-wrap gap-4">
          {existingPictures.map((url, i) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-24 w-24 object-cover rounded-md border" />
              <button
                type="button"
                onClick={() => setExistingPictures(existingPictures.filter((_, idx) => idx !== i))}
                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 text-xs"
              >
                ×
              </button>
            </div>
          ))}
          {picturePreviews.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" className="h-24 w-24 object-cover rounded-md border" />
          ))}
        </div>
      </section>

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
  );
}
