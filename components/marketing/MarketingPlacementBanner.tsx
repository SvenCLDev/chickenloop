'use client';

import { useEffect, useState } from 'react';
import MarketingBannerDisplay from '@/components/marketing/MarketingBannerDisplay';

export interface PlacementBannerData {
  headline: string;
  subheadline: string;
  cta: string;
  image: string;
  analyticsSource: string;
  variantKey: string;
  styleKey: string;
  href: string;
}

interface MarketingPlacementBannerProps {
  placementKey: string;
  className?: string;
}

/** Renders the active marketing banner for a placement (DB-driven). */
export default function MarketingPlacementBanner({
  placementKey,
  className = '',
}: MarketingPlacementBannerProps) {
  const [banner, setBanner] = useState<PlacementBannerData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/marketing/placement/${encodeURIComponent(placementKey)}`)
      .then((res) => res.json())
      .then((data: { banner?: PlacementBannerData | null }) => {
        if (!cancelled) {
          setBanner(data.banner ?? null);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBanner(null);
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [placementKey]);

  if (!loaded || !banner) return null;

  return (
    <MarketingBannerDisplay
      headline={banner.headline}
      subheadline={banner.subheadline}
      cta={banner.cta}
      image={banner.image}
      href={banner.href}
      analyticsSource={banner.analyticsSource}
      variantKey={banner.variantKey}
      styleKey={banner.styleKey}
      className={className}
    />
  );
}
