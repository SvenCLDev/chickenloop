'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useCookieConsent } from '../contexts/CookieConsentContext';
import Link from 'next/link';

export default function CookieSettingsPage() {
  const { consent, setConsent, showBannerState } = useCookieConsent();
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
    functional: false,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (consent) {
      setPreferences({
        necessary: consent.necessary,
        analytics: consent.analytics,
        marketing: consent.marketing,
        functional: consent.functional,
      });
    }
  }, [consent]);

  const handleSave = () => {
    setConsent({
      ...preferences,
      timestamp: new Date().toISOString(),
      version: '1.0',
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
    };
    setPreferences(allAccepted);
    setConsent({
      ...allAccepted,
      timestamp: new Date().toISOString(),
      version: '1.0',
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleRejectAll = () => {
    const allRejected = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
    };
    setPreferences(allRejected);
    setConsent({
      ...allRejected,
      timestamp: new Date().toISOString(),
      version: '1.0',
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Cookie Settings</h1>
          <p className="text-gray-600 mb-8">
            Manage your cookie preferences. You can enable or disable different types of cookies below. 
            Learn more in our{' '}
            <Link href="/cookie-policy" className="text-blue-600 hover:underline">
              Cookie Policy
            </Link>
            {' '}and{' '}
            <Link href="/cookie-declaration" className="text-blue-600 hover:underline">
              Cookie Declaration
            </Link>
            .
          </p>

          {saved && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
              Your cookie preferences have been saved successfully.
            </div>
          )}

          <div className="space-y-6 mb-8">
            {/* Necessary Cookies */}
            <div className="flex items-start justify-between p-6 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-semibold text-gray-900">Necessary Cookies</h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Required</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Essential cookies required for the website to function properly. These cannot be disabled.
                </p>
                <p className="text-xs text-gray-500">
                  <strong>Examples:</strong> Session management, authentication, security features
                </p>
              </div>
              <div className="ml-4">
                <input
                  type="checkbox"
                  checked={preferences.necessary}
                  disabled
                  className="h-5 w-5 text-blue-600 rounded border-gray-300 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Analytics Cookies */}
            <div className="flex items-start justify-between p-6 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics Cookies</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Help us understand how visitors interact with our website by collecting and reporting information anonymously.
                </p>
                <p className="text-xs text-gray-500">
                  <strong>Examples:</strong> Page views, time spent on site, bounce rates
                </p>
              </div>
              <div className="ml-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* Marketing Cookies */}
            <div className="flex items-start justify-between p-6 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Marketing Cookies</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Used to track visitors across websites to display relevant advertisements.
                </p>
                <p className="text-xs text-gray-500">
                  <strong>Examples:</strong> Ad targeting, conversion tracking, remarketing
                </p>
              </div>
              <div className="ml-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* Functional Cookies */}
            <div className="flex items-start justify-between p-6 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Functional Cookies</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Enable enhanced functionality and personalization, such as remembering your preferences.
                </p>
                <p className="text-xs text-gray-500">
                  <strong>Examples:</strong> Language preferences, region settings, user interface customization
                </p>
              </div>
              <div className="ml-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.functional}
                    onChange={(e) => setPreferences({ ...preferences, functional: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
            <button
              onClick={handleRejectAll}
              className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Reject All
            </button>
            <button
              onClick={handleAcceptAll}
              className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Accept All
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-3 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors flex-1"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}






