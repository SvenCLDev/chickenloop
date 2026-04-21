'use client';

import Image from 'next/image';
import { useState } from 'react';
import { isBlobStorageUrl } from '@/lib/imageUtils';

interface JobCardImageProps {
  src: string;
  alt: string;
  priority?: boolean;
}

const BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyIiBoZWlnaHQ9IjgiIGZpbGw9IiNkMWQ1ZGIiLz48L3N2Zz4=';

export default function JobCardImage({ src, alt, priority = false }: JobCardImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative w-full h-full bg-gray-200 overflow-hidden">
      {!loaded && <div className="absolute inset-0 animate-pulse bg-gray-300" />}
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        priority={priority}
        fetchPriority={priority ? 'high' : 'auto'}
        loading={priority ? 'eager' : 'lazy'}
        quality={60}
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        onLoad={() => setLoaded(true)}
        className={`object-cover transition-all duration-300 group-hover:scale-110 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        unoptimized={isBlobStorageUrl(src)}
      />
    </div>
  );
}
