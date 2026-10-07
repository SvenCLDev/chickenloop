import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { getLocale } from 'next-intl/server';
import './globals.css';
import Providers from './components/Providers';
import GoogleAnalyticsConsentMode from './components/GoogleAnalyticsConsentMode';
import { GA_MEASUREMENT_ID } from '@/lib/analyticsConsent';
import { getSiteUrl } from '@/lib/siteUrl';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: 'Chickenloop | Watersports Talent Network & Job Board',
  description:
    'The global watersports talent network and free job board for kite, foil, surf, sail, dive and yacht crew. Verified profiles for pros. Trusted hiring for centres.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // html lang for first paint; client locale switches remount [locale] provider below.
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <head>
        <GoogleAnalyticsConsentMode />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <Providers>{children}</Providers>
        <SpeedInsights />
        <Analytics />
        <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />
      </body>
    </html>
  );
}
