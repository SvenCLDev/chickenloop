/** Hero background slides (first image is LCP on homepage). */
export const HOMEPAGE_HERO_IMAGES = [
  '/Kitesurfer.jpg',
  '/Sailing.jpg',
  '/Wingfoil.jpg',
  '/Diving.jpg',
] as const;

export const HOMEPAGE_HERO_LCP_IMAGE = HOMEPAGE_HERO_IMAGES[0];

/** LCP hero dimensions after public/Kitesurfer.jpg resize (1600px wide, 3:2). */
export const HOMEPAGE_HERO_LCP_WIDTH = 1600;
export const HOMEPAGE_HERO_LCP_HEIGHT = 1066;

export const HOMEPAGE_HERO_BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyIiBoZWlnaHQ9IjgiIGZpbGw9IiMxZTQwYWYiLz48L3N2Zz4=';

export const HOMEPAGE_HERO_ROTATION_MS = 5000;

export const HOMEPAGE_HERO_LCP_ELEMENT_ID = 'homepage-hero-lcp-image';
