'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { accountApi, apiRequest } from '@/lib/api';
import Link from 'next/link';

interface EmailPreferences {
  applicationUpdates: boolean;
  marketing: boolean;
}

export default function EditAccountPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [emailPreferences, setEmailPreferences] = useState<EmailPreferences>({
    applicationUpdates: true,
    marketing: false,
  });
  const [loading, setLoading] = useState(false);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'recruiter') {
      router.push(`/${user.role === 'admin' ? 'admin' : 'job-seeker'}`);
    } else if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
      });
      loadEmailPreferences();
    }
  }, [user, authLoading, router]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await accountApi.update({
        name: formData.name,
        email: formData.email,
      });
      setSuccess('Account updated successfully!');
      await refreshUser();
      setTimeout(() => {
        router.push('/recruiter');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update account');
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Edit Account</h1>
          <p className="text-gray-600">Update your account information and email preferences</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
                {success}
              </div>
            )}

            <hr className="my-6 border-gray-300" />

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

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Account'}
              </button>
              <Link
                href="/recruiter"
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 font-semibold text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
