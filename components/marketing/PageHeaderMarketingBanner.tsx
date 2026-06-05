'use client';

import MarketingPlacementBanner from '@/components/marketing/MarketingPlacementBanner';

/**
 * Renders the active experiment banner directly below the page header,
 * before the rest of the page content.
 */
export default function PageHeaderMarketingBanner({
  placementKey,
  className = 'mb-8',
}: {
  placementKey: string;
  className?: string;
}) {
  return <MarketingPlacementBanner placementKey={placementKey} className={className} />;
}
