import Link from 'next/link';
import Image from 'next/image';
import { getImageProps } from 'next/image';
import HomepageHeroRotationDeferred from './HomepageHeroRotationDeferred';
import {
  HOMEPAGE_HERO_BLUR_DATA_URL,
  HOMEPAGE_HERO_LCP_ELEMENT_ID,
  HOMEPAGE_HERO_LCP_HEIGHT,
  HOMEPAGE_HERO_LCP_IMAGE,
  HOMEPAGE_HERO_LCP_WIDTH,
} from '@/lib/homepageHero';

export default function HomepageHero() {
  return (
    <section className="relative h-[60vh] min-h-[400px] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <div
          id={HOMEPAGE_HERO_LCP_ELEMENT_ID}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out opacity-100"
        >
          <Image
            src={HOMEPAGE_HERO_LCP_IMAGE}
            alt="Kitesurfer on the water — Chickenloop watersports talent network"
            fill
            priority
            fetchPriority="high"
            quality={60}
            placeholder="blur"
            blurDataURL={HOMEPAGE_HERO_BLUR_DATA_URL}
            sizes={HOMEPAGE_HERO_LCP_SIZES}
            className="object-cover"
          />
        </div>
        <HomepageHeroRotationDeferred />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-cyan-900/60 to-teal-900/70" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="inline-block px-3 py-1 rounded-full bg-white/15 text-white/95 text-sm font-medium mb-4 drop-shadow-md">
          Verified profiles · Global community · Free to join
        </p>
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 drop-shadow-lg">
          <span className="block">The Watersports</span>
          <span className="block">Talent Network & Job Board</span>
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-3 sm:mb-4 drop-shadow-md max-w-2xl mx-auto">
          The only platform where verified instructors, crew & pros connect with centres hiring
          worldwide.
        </p>
        <p className="text-sm sm:text-base md:text-lg text-white/80 mb-6 sm:mb-8 drop-shadow-md">
          Kite · Foil · Surf · Sail · Dive · Yacht Crew
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            href="/jobs"
            className="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-all duration-200 font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Browse Jobs
          </Link>
          <Link
            href="/talent"
            className="inline-block px-6 sm:px-8 py-3 sm:py-4 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-all duration-200 font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl"
          >
            Explore Talent
          </Link>
        </div>
        <p className="mt-4 sm:mt-5">
          <Link
            href="/register"
            className="text-sm sm:text-base text-white/90 hover:text-white underline underline-offset-2"
          >
            List your profile free →
          </Link>
        </p>
      </div>
    </section>
  );
}

/** Shared LCP hero image sizing — keep in sync with the `<Image>` above. */
export const HOMEPAGE_HERO_LCP_SIZES = '(max-width: 768px) 100vw, 1600px';

/** Preload props matching the LCP hero `<Image>` (used in app/page.tsx). */
export function getHomepageHeroLcpPreloadProps() {
  return getImageProps({
    src: HOMEPAGE_HERO_LCP_IMAGE,
    alt: '',
    width: HOMEPAGE_HERO_LCP_WIDTH,
    height: HOMEPAGE_HERO_LCP_HEIGHT,
    quality: 60,
    sizes: HOMEPAGE_HERO_LCP_SIZES,
    priority: true,
  }).props;
}
