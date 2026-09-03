/** Google Analytics 4 measurement ID (site-wide). */
export const GA_MEASUREMENT_ID = 'G-FB7EFJK0KW';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Update Google Consent Mode v2 analytics storage state. */
export function applyAnalyticsConsent(granted: boolean): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('consent', 'update', {
    analytics_storage: granted ? 'granted' : 'denied',
  });
}
