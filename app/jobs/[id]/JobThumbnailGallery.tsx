'use client';

import React, { useState } from 'react';

interface JobThumbnailGalleryProps {
  pictures: string[];
  jobTitle: string;
  allPictures?: string[]; // All pictures including hero, for lightbox navigation
}

export default function JobThumbnailGallery({ pictures, jobTitle, allPictures }: JobThumbnailGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Use allPictures for lightbox if provided, otherwise use just these pictures
  const lightboxPictures = allPictures || pictures;
  
  // Find the starting index in the full picture array for lightbox navigation
  const getLightboxIndex = (thumbnailIndex: number): number => {
    if (!allPictures || allPictures.length === 0) return thumbnailIndex;
    const thumbnailPicture = pictures[thumbnailIndex];
    const fullIndex = allPictures.findIndex(p => p === thumbnailPicture);
    return fullIndex >= 0 ? fullIndex : thumbnailIndex;
  };

  if (!pictures || pictures.length === 0) {
    return null;
  }

  return (
    <>
      {/* Thumbnail Grid Only - No Featured Image */}
      <div className="grid grid-cols-3 gap-2">
        {pictures.map((picture, index) => (
          <button
            key={index}
            onClick={() => {
              setLightboxIndex(getLightboxIndex(index));
              setIsLightboxOpen(true);
            }}
            className="w-full h-32 overflow-hidden rounded-lg border border-gray-300 p-0"
            type="button"
          >
            <img
              src={picture}
              alt={`${jobTitle} - Image ${index + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (img.src.includes('/uploads/')) {
                  img.style.display = 'none';
                } else {
                  console.error('Failed to load image:', img.src);
                }
              }}
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {isLightboxOpen && lightboxPictures.length > 0 && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="relative max-w-3xl w-full mx-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={lightboxPictures[lightboxIndex]}
              alt={`${jobTitle} - Image ${lightboxIndex + 1}`}
              className="w-full h-[70vh] object-contain bg-black"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = 'none';
                const errorDiv = document.createElement('div');
                errorDiv.className = 'w-full h-[70vh] flex items-center justify-center bg-black text-white';
                errorDiv.textContent = 'Image not available';
                img.parentElement?.appendChild(errorDiv);
              }}
            />
            {lightboxPictures.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex((prev) =>
                      prev === 0 ? lightboxPictures.length - 1 : prev - 1
                    )
                  }
                  className="absolute top-1/2 -translate-y-1/2 left-2 bg-white/80 text-gray-900 rounded-full p-2"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex((prev) =>
                      prev === lightboxPictures.length - 1 ? 0 : prev + 1
                    )
                  }
                  className="absolute top-1/2 -translate-y-1/2 right-2 bg-white/80 text-gray-900 rounded-full p-2"
                >
                  ›
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-2 right-2 bg-white/80 text-gray-900 rounded-full p-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
