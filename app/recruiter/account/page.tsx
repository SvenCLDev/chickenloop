'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import { apiRequest } from '@/lib/api';
import Link from 'next/link';

interface EmailPreferences {
  applicationUpdates: boolean;
  marketing: boolean;
}

export default function RecruiterAccountPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [emailPreferences, setEmailPreferences] = useState<EmailPreferences>({
    applicationUpdates: true,
    marketing: false,
  });
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesError, setPreferencesError] = useState('');
  const [preferencesSuccess, setPreferencesSuccess] = useState('');

  // Load email preferences
  const loadEmailPreferences = async () => {
    try {
      setLoadingPreferences(true);
      setPreferencesError('');
      const response = await apiRequest('/email-preferences');
      if (response.success && response.preferences) {
        setEmailPreferences({
          applicationUpdates: response.preferences.applicationUpdates ?? true,
          marketing: response.preferences.marketing ?? false,
        });
      }
    } catch (err: any) {
      console.error('Failed to load email preferences:', err);
      setPreferencesError(err.message || 'Failed to load email preferences');
    } finally {
      setLoadingPreferences(false);
    }
  };

  // Save email preferences
  const saveEmailPreferences = async () => {
    try {
      setSavingPreferences(true);
      setPreferencesError('');
      setPreferencesSuccess('');
      
      const response = await apiRequest('/email-preferences', {
        method: 'PATCH',
        body: JSON.stringify(emailPreferences),
      });
      
      if (response.success) {
        setPreferencesSuccess('Email preferences updated successfully!');
        // Clear success message after 3 seconds
        setTimeout(() => setPreferencesSuccess(''), 3000);
      }
    } catch (err: any) {
      setPreferencesError(err.message || 'Failed to update email preferences');
    } finally {
      setSavingPreferences(false);
    }
  };

  // Track if preferences have been loaded (to prevent auto-save on initial mount)
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  
  useEffect(() => {
    if (!loadingPreferences && user) {
      setPreferencesLoaded(true);
    }
  }, [loadingPreferences, user]);

  // Auto-save preferences when they change (debounced, only after initial load)
  useEffect(() => {
    if (!user || loadingPreferences || !preferencesLoaded || savingPreferences) return;
    
    const timeoutId = setTimeout(() => {
      saveEmailPreferences();
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailPreferences.applicationUpdates, emailPreferences.marketing]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'recruiter') {
      router.push(`/${user.role === 'admin' ? 'admin' : 'job-seeker'}`);
    } else if (user) {
      loadEmailPreferences();
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <Link
            href="/recruiter"
            className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Account Settings</h1>
          <p className="text-gray-600">Manage your account preferences</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Email Preferences Section */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Email Preferences</h2>
            <p className="text-sm text-gray-600 mb-4">
              Control which emails you receive from ChickenLoop
            </p>

            {loadingPreferences && (
              <div className="text-sm text-gray-500 mb-4">Loading preferences...</div>
            )}

            {/* Application Updates Toggle */}
            <div className="mb-6">
              <label className="flex items-center justify-between">
                <div>
                  <span className="block text-sm font-medium text-gray-700">Application Updates</span>
                  <span className="text-xs text-gray-500">Receive notifications when candidates apply to your jobs</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailPreferences({ ...emailPreferences, applicationUpdates: !emailPreferences.applicationUpdates })}
                  disabled={savingPreferences || loadingPreferences}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    emailPreferences.applicationUpdates ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                  role="switch"
                  aria-checked={emailPreferences.applicationUpdates}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      emailPreferences.applicationUpdates ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
            </div>

            {/* Marketing Emails Toggle */}
            <div className="mb-4">
              <label className="flex items-center justify-between">
                <div>
                  <span className="block text-sm font-medium text-gray-700">Marketing Emails</span>
                  <span className="text-xs text-gray-500">Receive promotional emails and updates from ChickenLoop</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailPreferences({ ...emailPreferences, marketing: !emailPreferences.marketing })}
                  disabled={savingPreferences || loadingPreferences}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    emailPreferences.marketing ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                  role="switch"
                  aria-checked={emailPreferences.marketing}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      emailPreferences.marketing ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
            </div>

            {preferencesError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                {preferencesError}
              </div>
            )}

            {preferencesSuccess && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md text-sm">
                {preferencesSuccess}
              </div>
            )}

            {savingPreferences && (
              <div className="text-sm text-gray-500 mb-2">Saving preferences...</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
