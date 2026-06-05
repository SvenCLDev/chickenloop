import type { EquipmentBannerVariant } from '@/lib/equipmentTracking/bannerConfig';

/** Display dimensions and Next/Image `sizes` so optimized assets match rendered size. */
export function getBannerImageLayout(variant: EquipmentBannerVariant): {
  containerClass: string;
  sizes: string;
} {
  if (variant === 'C') {
    return {
      containerClass:
        'relative w-36 sm:w-44 md:w-48 aspect-[2/1] flex-shrink-0',
      sizes: '(max-width: 640px) 144px, 192px',
    };
  }

  // Width unchanged from prior layout; aspect ratios use half the previous height (16/10 → 16/5, 4/3 → 8/3)
  return {
    containerClass:
      'relative w-full min-h-[100px] sm:min-h-0 sm:w-72 md:w-80 lg:w-96 aspect-[16/5] sm:aspect-[8/3] flex-shrink-0',
    sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 320px, 384px',
  };
}

/** Next.js `quality` must be listed in next.config `images.qualities` */
export const BANNER_IMAGE_QUALITY = 85;
