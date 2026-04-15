'use client';

import { AuthProvider } from '../contexts/AuthContext';
import { CookieConsentProvider } from '../contexts/CookieConsentContext';
import CookieConsentBanner from './CookieConsentBanner';
import Footer from './Footer';
import { SessionProvider } from 'next-auth/react';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProvider>
        <CookieConsentProvider>
          <>
            <div className="flex-1">
              {children}
            </div>
            <Footer />
            <CookieConsentBanner />
          </>
        </CookieConsentProvider>
      </AuthProvider>
    </SessionProvider>
  );
}

