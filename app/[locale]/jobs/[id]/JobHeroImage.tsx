import React from 'react';
import Image, { getImageProps } from 'next/image';

interface JobHeroImageProps {
  imageUrl: string;
  jobTitle: string;
}

/** Keep in sync with the JobHeroImage <Image> below — used for LCP preload. */
export const JOB_HERO_LCP_SIZES = '(max-width: 1024px) 100vw, 1024px';

/** Intrinsic size used only for getImageProps preload math (display uses fill + h-64). */
const JOB_HERO_PRELOAD_WIDTH = 1024;
const JOB_HERO_PRELOAD_HEIGHT = 256;

/**
 * Preload props matching the LCP hero <Image> (used in job detail page head).
 * Mirrors homepage pattern in HomepageHero / app/page.tsx.
 */
export function getJobHeroLcpPreloadProps(imageUrl: string) {
  return getImageProps({
    src: imageUrl,
    alt: '',
    width: JOB_HERO_PRELOAD_WIDTH,
    height: JOB_HERO_PRELOAD_HEIGHT,
    quality: 60,
    sizes: JOB_HERO_LCP_SIZES,
    priority: true,
  }).props;
}

/** Server-rendered so the LCP <img> is in the initial HTML (reduces resource load delay). */
export default function JobHeroImage({ imageUrl, jobTitle }: JobHeroImageProps) {
  return (
    <div className="w-full">
      <div className="relative w-full h-64 bg-gray-200 overflow-hidden">
        <Image
          src={imageUrl}
          alt={`${jobTitle} - Featured`}
          fill
          priority
          fetchPriority="high"
          quality={60}
          sizes={JOB_HERO_LCP_SIZES}
          className="object-cover"
        />
      </div>
    </div>
  );
}
