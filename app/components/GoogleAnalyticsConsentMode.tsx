import Script from 'next/script';

/** Consent Mode v2 defaults — must run before gtag.js config (beforeInteractive). */
export default function GoogleAnalyticsConsentMode() {
  return (
    <Script id="google-consent-mode-defaults" strategy="beforeInteractive">
      {`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('consent', 'default', {
          analytics_storage: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          wait_for_update: 500
        });
      `}
    </Script>
  );
}
