'use client';

import { AuthProvider } from '../contexts/AuthContext';
import { CookieConsentProvider } from '../contexts/CookieConsentContext';
import ConsentGatedGoogleAnalytics from './ConsentGatedGoogleAnalytics';
import CookieConsentBanner from './CookieConsentBanner';
import Footer from './Footer';
import { SessionProvider } from 'next-auth/react';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <AuthProvider>
        <CookieConsentProvider>
          <>
            <div className="flex-1">
              {children}
            </div>
            <Footer />
            <CookieConsentBanner />
            <ConsentGatedGoogleAnalytics />
          </>
        </CookieConsentProvider>
      </AuthProvider>
    </SessionProvider>
  );
}

