'use client';

import { useState } from 'react';
import { compressIncomingJobPhotoFiles } from '@/lib/compressJobImage';
import { validateJobPhotoFilesForUpload } from '@/lib/jobPostPayload';

type ProfilePhotosSectionProps = {
  existingPictures: string[];
  onExistingPicturesChange: (pictures: string[]) => void;
  selectedPictures: File[];
  onSelectedPicturesChange: (files: File[]) => void;
  picturePreviews: string[];
  onPicturePreviewsChange: (previews: string[]) => void;
  heroImageUrl: string | null;
  onHeroImageUrlChange: (url: string | null) => void;
  heroImageIndex: number | null;
  onHeroImageIndexChange: (index: number | null) => void;
  onError: (message: string) => void;
};

export function orderProfilePicturesWithMainFirst(
  paths: string[],
  existingCount: number,
  mainExistingUrl: string | null,
  mainNewIndex: number | null
): string[] {
  if (paths.length === 0) return paths;

  let mainUrl: string | undefined;
  if (mainExistingUrl && paths.includes(mainExistingUrl)) {
    mainUrl = mainExistingUrl;
  } else if (mainNewIndex !== null && mainNewIndex >= 0) {
    const pathIndex = existingCount + mainNewIndex;
    if (pathIndex < paths.length) {
      mainUrl = paths[pathIndex];
    }
  }

  if (!mainUrl) return paths;
  return [mainUrl, ...paths.filter((path) => path !== mainUrl)];
}

export default function ProfilePhotosSection({
  existingPictures,
  onExistingPicturesChange,
  selectedPictures,
  onSelectedPicturesChange,
  picturePreviews,
  onPicturePreviewsChange,
  heroImageUrl,
  onHeroImageUrlChange,
  heroImageIndex,
  onHeroImageIndexChange,
  onError,
}: ProfilePhotosSectionProps) {
  const [optimizingPictures, setOptimizingPictures] = useState(false);
  const [optimizingMessage, setOptimizingMessage] = useState('');

  const totalSelected = existingPictures.length + selectedPictures.length;

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const files = Array.from(input.files || []);
    input.value = '';

    void (async () => {
      if (totalSelected + files.length > 3) {
        onError('Maximum 3 pictures allowed');
        return;
      }

      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      for (const file of files) {
        if (!validTypes.includes(file.type)) {
          onError(
            `Invalid file type: ${file.name}. Only images (JPEG, PNG, WEBP, GIF) are allowed.`
          );
          return;
        }
      }

      setOptimizingPictures(true);
      setOptimizingMessage('Optimizing image…');
      onError('');

      const compressed = await compressIncomingJobPhotoFiles(files, (msg) =>
        setOptimizingMessage(msg)
      );
      if (!compressed.ok) {
        onError(compressed.error);
        setOptimizingPictures(false);
        setOptimizingMessage('');
        return;
      }

      const newPictures = [...selectedPictures, ...compressed.files];
      const uploadErr = validateJobPhotoFilesForUpload(newPictures);
      if (uploadErr) {
        onError(uploadErr);
        setOptimizingPictures(false);
        setOptimizingMessage('');
        return;
      }

      onSelectedPicturesChange(newPictures);
      const newPreviews = compressed.files.map((file) => URL.createObjectURL(file));
      onPicturePreviewsChange([...picturePreviews, ...newPreviews]);

      if (
        existingPictures.length === 0 &&
        selectedPictures.length === 0 &&
        compressed.files.length > 0 &&
        heroImageIndex === null &&
        heroImageUrl === null
      ) {
        onHeroImageIndexChange(0);
      }

      setOptimizingPictures(false);
      setOptimizingMessage('');
    })();
  };

  const removeExistingPicture = (index: number) => {
    const removedUrl = existingPictures[index];
    const nextExisting = existingPictures.filter((_, i) => i !== index);
    onExistingPicturesChange(nextExisting);

    if (heroImageUrl === removedUrl) {
      if (nextExisting.length > 0) {
        onHeroImageUrlChange(nextExisting[0]);
        onHeroImageIndexChange(null);
      } else if (selectedPictures.length > 0) {
        onHeroImageUrlChange(null);
        onHeroImageIndexChange(0);
      } else {
        onHeroImageUrlChange(null);
        onHeroImageIndexChange(null);
      }
    }
  };

  const removeNewPicture = (index: number) => {
    URL.revokeObjectURL(picturePreviews[index]);
    onSelectedPicturesChange(selectedPictures.filter((_, i) => i !== index));
    onPicturePreviewsChange(picturePreviews.filter((_, i) => i !== index));

    if (heroImageIndex === index) {
      onHeroImageIndexChange(selectedPictures.length > 1 ? 0 : null);
      if (existingPictures.length > 0 && selectedPictures.length <= 1) {
        onHeroImageUrlChange(existingPictures[0]);
      }
    } else if (heroImageIndex !== null && heroImageIndex > index) {
      onHeroImageIndexChange(heroImageIndex - 1);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Profile Photos</h2>

      {(existingPictures.length > 0 || selectedPictures.length > 0) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Main profile photo</label>
          <p className="text-xs text-gray-500">
            This image is shown first on your profile and in recruiter search results.
          </p>
        </div>
      )}

      {existingPictures.length > 0 && (
        <div>
          <p className="text-sm text-gray-600 mb-2">Existing photos</p>
          <div className="grid grid-cols-3 gap-4">
            {existingPictures.map((picture, index) => (
              <div key={`${picture}-${index}`} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
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
                      name="profileMainPhoto"
                      checked={heroImageUrl === picture}
                      onChange={() => {
                        onHeroImageUrlChange(picture);
                        onHeroImageIndexChange(null);
                      }}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-xs font-medium text-gray-700">
                      {heroImageUrl === picture ? 'Main photo' : 'Set as main'}
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label htmlFor="profile-photos" className="block text-sm font-medium text-gray-700 mb-1">
          Pictures (up to 3)
        </label>
        <div className="relative">
          <input
            id="profile-photos"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            multiple
            onChange={handlePictureChange}
            disabled={totalSelected >= 3 || optimizingPictures}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
          />
          {totalSelected >= 3 ? (
            <div className="block w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-center bg-gray-100 text-gray-400">
              Image limit reached (3 of 3)
            </div>
          ) : (
            <label
              htmlFor="profile-photos"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-center cursor-pointer transition-colors bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
            >
              {totalSelected === 0 ? 'Choose images (up to 3)' : 'Choose another image'}
            </label>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Maximum 3 pictures total (including existing). You can pick up to ~6 MB each; images are
          optimized in your browser before upload (target under ~1 MB each).
        </p>
        {optimizingPictures && (
          <p className="text-sm text-blue-700 mt-2" role="status" aria-live="polite">
            {optimizingMessage || 'Optimizing image…'}
          </p>
        )}
      </div>

      {selectedPictures.length > 0 && (
        <div>
          <p className="text-sm text-gray-600 mb-2">New photos</p>
          <div className="grid grid-cols-3 gap-4">
            {picturePreviews.map((preview, index) => (
              <div key={preview} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className={`w-full h-32 object-cover rounded-lg border-2 ${
                    heroImageIndex === index && heroImageUrl === null
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
                      name="profileMainPhoto"
                      checked={heroImageIndex === index && heroImageUrl === null}
                      onChange={() => {
                        onHeroImageIndexChange(index);
                        onHeroImageUrlChange(null);
                      }}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-xs font-medium text-gray-700">
                      {heroImageIndex === index && heroImageUrl === null ? 'Main photo' : 'Set as main'}
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
