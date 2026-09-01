'use client';

import { useEffect, useState } from 'react';
import { useCookieConsent } from '@/app/contexts/CookieConsentContext';
import { deferUntilIdle } from '@/lib/deferUntilIdle';
import GoogleAnalytics from './GoogleAnalytics';

/** Loads Google Analytics only when the user has opted in to analytics cookies. */
export default function ConsentGatedGoogleAnalytics() {
  const { consent } = useCookieConsent();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!consent?.analytics) {
      setReady(false);
      return;
    }

    return deferUntilIdle(() => setReady(true), 5000);
  }, [consent?.analytics]);

  if (!consent?.analytics || !ready) {
    return null;
  }

  return <GoogleAnalytics />;
}
