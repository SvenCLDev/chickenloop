import type { EquipmentAnalyticsEvent } from '@/lib/equipmentAnalytics';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Fire-and-forget equipment validation analytics (MongoDB via API).
 * Also sends to gtag when available (site-wide Google Analytics).
 */
export function trackEquipmentAnalytics(
  event: EquipmentAnalyticsEvent,
  source: string,
  metadata?: Record<string, unknown>
): void {
  const normalizedSource = source.trim();
  if (!normalizedSource) return;

  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', event, {
      event_category: 'equipment_validation',
      source: normalizedSource,
      ...metadata,
    });
  }

  fetch('/api/equipment-analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event,
      source: normalizedSource,
      metadata,
    }),
  }).catch(() => {
    // Non-blocking; validation metrics must not break UX
  });
}
