'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { trackEquipmentAnalytics } from '@/lib/equipmentAnalyticsClient';
import { isEquipmentBannerVariant, type EquipmentBannerVariant } from '@/lib/equipmentTracking/bannerConfig';
import { BANNER_IMAGE_QUALITY, getBannerImageLayout } from '@/components/marketing/bannerImageLayout';

export interface MarketingBannerDisplayProps {
  headline: string;
  subheadline: string;
  cta: string;
  image: string;
  href: string;
  analyticsSource: string;
  variantKey: string;
  styleKey?: string;
  /** Optional HEX background; empty uses style preset */
  backgroundColor?: string;
  className?: string;
}

const VARIANT_STYLES: Record<
  EquipmentBannerVariant,
  { container: string; headline: string; subheadline: string; cta: string; imageWrap: string }
> = {
  A: {
    container:
      'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border border-blue-700/30',
    headline: 'text-white',
    subheadline: 'text-blue-100',
    cta: 'text-white font-semibold',
    imageWrap: 'ring-2 ring-white/30',
  },
  B: {
    container:
      'bg-white hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-300 shadow-md',
    headline: 'text-gray-900',
    subheadline: 'text-gray-600',
    cta: 'text-blue-600 font-semibold',
    imageWrap: 'ring-1 ring-gray-200',
  },
  C: {
    container:
      'bg-gradient-to-br from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 border border-blue-200',
    headline: 'text-gray-900',
    subheadline: 'text-gray-600',
    cta: 'text-blue-700 font-semibold',
    imageWrap: 'ring-2 ring-blue-200',
  },
};

function resolveStyle(styleKey?: string, variantKey?: string): EquipmentBannerVariant {
  if (styleKey && isEquipmentBannerVariant(styleKey)) return styleKey;
  if (variantKey && isEquipmentBannerVariant(variantKey)) return variantKey;
  return 'A';
}

export default function MarketingBannerDisplay({
  headline,
  subheadline,
  cta,
  image,
  href,
  analyticsSource,
  variantKey,
  styleKey,
  backgroundColor = '',
  className = '',
}: MarketingBannerDisplayProps) {
  const variant = resolveStyle(styleKey, variantKey);
  const styles = VARIANT_STYLES[variant];
  const customBackground = backgroundColor.trim();
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;

    const storageKey = `equipment_banner_view_${analyticsSource}`;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(storageKey)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        trackEquipmentAnalytics('equipment_banner_view', analyticsSource, { variant: variantKey });
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(storageKey, '1');
        }
        observer.disconnect();
      },
      { threshold: 0.5, rootMargin: '0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [analyticsSource, variantKey]);

  const handleClick = () => {
    trackEquipmentAnalytics('equipment_banner_click', analyticsSource, { variant: variantKey });
  };

  const layoutClass =
    variant === 'C'
      ? 'flex flex-row items-center gap-4 sm:gap-6 p-4 sm:p-5'
      : 'flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 p-5 sm:p-6';

  const { containerClass: imageContainerClass, sizes: imageSizes } = getBannerImageLayout(variant);

  const imageBlock = (
    <div className={`${imageContainerClass} rounded-lg overflow-hidden ${styles.imageWrap}`}>
      <Image
        src={image}
        alt={headline}
        fill
        priority
        quality={BANNER_IMAGE_QUALITY}
        className="object-cover object-center group-hover:scale-[1.02] transition-transform duration-200"
        sizes={imageSizes}
      />
    </div>
  );

  return (
    <div ref={bannerRef} className={className}>
      <Link
        href={href}
        onClick={handleClick}
        style={customBackground ? { backgroundColor: customBackground } : undefined}
        className={`group block rounded-lg overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          customBackground
            ? 'border border-black/10 hover:brightness-[0.97]'
            : styles.container
        }`}
        aria-label={`${headline} — ${cta}`}
      >
        <div className={layoutClass}>
          {variant === 'C' && imageBlock}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <p className={`text-base sm:text-lg font-bold leading-snug ${styles.headline}`}>{headline}</p>
            <p className={`mt-1 text-sm sm:text-base leading-relaxed ${styles.subheadline}`}>
              {subheadline}
            </p>
            <p className={`mt-2 text-sm inline-flex items-center gap-1 ${styles.cta} group-hover:underline`}>
              {cta}
              <span aria-hidden>→</span>
            </p>
          </div>
          {variant !== 'C' && imageBlock}
        </div>
      </Link>
    </div>
  );
}
