'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface JobHeroImageProps {
  imageUrl: string;
  jobTitle: string;
}

export default function JobHeroImage({ imageUrl, jobTitle }: JobHeroImageProps) {
  const [error, setError] = useState(false);

  return (
    <div className="w-full">
      <div className="relative w-full h-64 bg-gray-200 overflow-hidden">
        {!error && (
        <Image
          src={imageUrl}
          alt={`${jobTitle} - Featured`}
          fill
          priority
          fetchPriority="high"
          quality={60}
          sizes="(max-width: 1024px) 100vw, 1024px"
          className="object-cover"
          onError={() => {
            if (imageUrl.includes('/uploads/')) {
              setError(true);
            } else {
              console.error('Failed to load image from Blob Storage:', imageUrl);
              setError(true);
            }
          }}
        />
        )}
      </div>
    </div>
  );
}
