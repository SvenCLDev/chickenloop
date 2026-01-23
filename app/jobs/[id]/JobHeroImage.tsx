'use client';

import React from 'react';

interface JobHeroImageProps {
  imageUrl: string;
  jobTitle: string;
}

export default function JobHeroImage({ imageUrl, jobTitle }: JobHeroImageProps) {
  return (
    <div className="w-full">
      <div className="relative w-full h-64 bg-gray-200 overflow-hidden">
        <img
          src={imageUrl}
          alt={`${jobTitle} - Featured`}
          className="w-full h-full object-cover"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            const imageUrl = img.src || '';
            if (imageUrl.includes('/uploads/')) {
              img.style.display = 'none';
            } else {
              console.error('Failed to load image from Blob Storage:', imageUrl);
            }
          }}
        />
      </div>
    </div>
  );
}
