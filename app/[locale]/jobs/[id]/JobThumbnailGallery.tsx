'use client';

import React, { useState } from 'react';
import Image from 'next/image';

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

  const count = pictures.length;
  const gridCols = count === 1 ? 'grid-cols-1' : count === 2 ? 'grid-cols-2' : 'grid-cols-3';
  const thumbHeight = count === 1 ? 'h-64 sm:h-80' : 'h-32';
  const thumbSizes =
    count === 1
      ? '(max-width: 1024px) 100vw, 896px'
      : count === 2
        ? '(max-width: 1024px) 50vw, 448px'
        : '(max-width: 1024px) 33vw, 300px';

  return (
    <>
      {/* Thumbnail Grid - 1 = full width, 2 = half each, 3 = third each */}
      <div className={`grid ${gridCols} gap-2`}>
        {pictures.map((picture, index) => (
          <button
            key={index}
            onClick={() => {
              setLightboxIndex(getLightboxIndex(index));
              setIsLightboxOpen(true);
            }}
            className={`relative w-full ${thumbHeight} overflow-hidden rounded-lg border border-gray-300 p-0`}
            type="button"
          >
            <Image
              src={picture}
              alt={`${jobTitle} - Image ${index + 1}`}
              fill
              loading="lazy"
              quality={60}
              sizes={thumbSizes}
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {/* Lightbox — full-res only when opened */}
      {isLightboxOpen && lightboxPictures.length > 0 && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="relative max-w-3xl w-full mx-auto h-[70vh]"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={lightboxPictures[lightboxIndex]}
              alt={`${jobTitle} - Image ${lightboxIndex + 1}`}
              fill
              quality={75}
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-contain bg-black"
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
                  className="absolute top-1/2 -translate-y-1/2 left-2 bg-white/80 text-gray-900 rounded-full p-2 z-10"
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
                  className="absolute top-1/2 -translate-y-1/2 right-2 bg-white/80 text-gray-900 rounded-full p-2 z-10"
                >
                  ›
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-2 right-2 bg-white/80 text-gray-900 rounded-full px-3 py-1 text-sm z-10"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
