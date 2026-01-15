'use client';

import React, { useState } from 'react';

interface JobImageGalleryProps {
  pictures: string[];
  jobTitle: string;
}

export default function JobImageGallery({ pictures, jobTitle }: JobImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  if (!pictures || pictures.length === 0) {
    return null;
  }

  return (
    <>
      {/* Featured Image */}
      {pictures.length > 0 && (
        <div className="w-full">
          <div className="relative w-full h-64 bg-gray-200 overflow-hidden">
            <img
              src={pictures[0]}
              alt={`${jobTitle} - Featured`}
              className="w-full h-full object-cover"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                const imageUrl = img.src || pictures[0] || '';
                if (imageUrl.includes('/uploads/')) {
                  img.style.display = 'none';
                } else {
                  console.error('Failed to load image from Blob Storage:', imageUrl);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Thumbnail Grid */}
      {pictures.length > 1 && (
        <div className="mb-6">
          <div className="grid grid-cols-3 gap-2">
            {pictures.map((picture, index) => (
              <button
                key={index}
                onClick={() => {
                  setLightboxIndex(index);
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
        </div>
      )}

      {/* Lightbox */}
      {isLightboxOpen && pictures.length > 0 && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="relative max-w-3xl w-full mx-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={pictures[lightboxIndex]}
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
            {pictures.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex((prev) =>
                      prev === 0 ? pictures.length - 1 : prev - 1
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
                      prev === pictures.length - 1 ? 0 : prev + 1
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


