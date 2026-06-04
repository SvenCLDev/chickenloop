'use client';

import MarketingBannerDisplay from '@/components/marketing/MarketingBannerDisplay';
import {
  getEquipmentBannerConfig,
  type EquipmentBannerVariant,
} from '@/lib/equipmentTracking/bannerConfig';

export type { EquipmentBannerVariant } from '@/lib/equipmentTracking/bannerConfig';

export interface EquipmentTrackingBannerProps {
  variant: EquipmentBannerVariant;
  className?: string;
}

export default function EquipmentTrackingBanner({
  variant,
  className = '',
}: EquipmentTrackingBannerProps) {
  const config = getEquipmentBannerConfig(variant);
  const href = `/tools/equipment-tracking?source=${encodeURIComponent(config.source)}`;

  return (
    <MarketingBannerDisplay
      headline={config.headline}
      subheadline={config.subheadline}
      cta={config.cta}
      image={config.image}
      href={href}
      analyticsSource={config.source}
      variantKey={variant}
      styleKey={variant}
      className={className}
    />
  );
}
