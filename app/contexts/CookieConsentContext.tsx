'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { applyAnalyticsConsent } from '@/lib/analyticsConsent';

export interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  timestamp: string;
  version: string;
}

interface CookieConsentContextType {
  consent: CookieConsent | null;
  showBanner: boolean;
  setConsent: (consent: CookieConsent) => void;
  showBannerState: () => void;
  hideBanner: () => void;
  hasConsented: () => boolean;
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

const CONSENT_STORAGE_KEY = 'chickenloop_cookie_consent';
const CONSENT_VERSION = '1.0';

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsentState] = useState<CookieConsent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load consent from localStorage
    const storedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (storedConsent) {
      try {
        const parsed = JSON.parse(storedConsent);
        // Check if consent version matches (for future updates)
        if (parsed.version === CONSENT_VERSION) {
          setConsentState(parsed);
          applyAnalyticsConsent(parsed.analytics);
          setShowBanner(false);
        } else {
          // Version mismatch, show banner again
          setShowBanner(true);
        }
      } catch (e) {
        setShowBanner(true);
      }
    } else {
      setShowBanner(true);
    }
  }, []);

  const setConsent = (newConsent: CookieConsent) => {
    const consentWithMeta = {
      ...newConsent,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    
    // Store in localStorage
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentWithMeta));
    
    // Log consent (you can also send to your API here)
    logConsent(consentWithMeta);
    
    setConsentState(consentWithMeta);
    setShowBanner(false);
    
    // Trigger cookie loading based on consent
    loadCookiesBasedOnConsent(consentWithMeta);
  };

  const logConsent = async (consentData: CookieConsent) => {
    try {
      // Optionally send to your API to log consent in database
      await fetch('/api/cookie-consent/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consentData),
      });
    } catch (error) {
      // Silently fail - consent is still stored in localStorage
      console.error('Failed to log consent:', error);
    }
  };

  const loadCookiesBasedOnConsent = (consentData: CookieConsent) => {
    applyAnalyticsConsent(consentData.analytics);

    // Load marketing cookies if consented
    if (consentData.marketing) {
      // Add your marketing scripts here
    }
    
    // Load functional cookies if consented
    if (consentData.functional) {
      // Add your functional scripts here
    }
  };

  const showBannerState = () => {
    setShowBanner(true);
  };

  const hideBanner = () => {
    setShowBanner(false);
  };

  const hasConsented = () => {
    return consent !== null;
  };

  // Always provide the context, even before mounting
  // This prevents the "must be used within provider" error
  return (
    <CookieConsentContext.Provider
      value={{
        consent,
        showBanner: mounted ? showBanner : false,
        setConsent,
        showBannerState,
        hideBanner,
        hasConsented,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (context === undefined) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }
  return context;
}

