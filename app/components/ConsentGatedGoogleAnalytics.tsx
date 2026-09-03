'use client';

import { useEffect } from 'react';
import { useCookieConsent } from '@/app/contexts/CookieConsentContext';
import { applyAnalyticsConsent } from '@/lib/analyticsConsent';

/**
 * Syncs Google Consent Mode with cookie preferences.
 * gtag loads site-wide via @next/third-parties in layout (cookieless until granted).
 */
export default function ConsentGatedGoogleAnalytics() {
  const { consent } = useCookieConsent();

  useEffect(() => {
    if (consent === null) {
      return;
    }

    const granted = consent.analytics;

    const sync = () => applyAnalyticsConsent(granted);
    sync();

    if (typeof window.gtag === 'function') {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (typeof window.gtag === 'function') {
        sync();
        window.clearInterval(intervalId);
      }
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [consent]);

  return null;
}
