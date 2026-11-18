declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export type TalentNetworkPromoEvent =
  | 'talent_network_promo_view'
  | 'talent_network_promo_click';

/**
 * Fire-and-forget GA4 events for the Talent Network job-listing promo.
 */
export function trackTalentNetworkPromo(
  event: TalentNetworkPromoEvent,
  source: string,
  metadata?: Record<string, unknown>
): void {
  const normalizedSource = source.trim();
  if (!normalizedSource) return;
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  window.gtag('event', event, {
    event_category: 'talent_network_promo',
    source: normalizedSource,
    ...metadata,
  });
}
