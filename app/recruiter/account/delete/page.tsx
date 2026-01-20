'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { accountApi } from '@/lib/api';
import Link from 'next/link';

export default function DeleteAccountPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'recruiter') {
      router.push(`/${user.role === 'admin' ? 'admin' : 'job-seeker'}`);
    }
  }, [user, authLoading, router]);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    if (!confirm('Are you absolutely sure you want to delete your account? This action cannot be undone and will delete all your data including your jobs and company.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await accountApi.delete();
      await logout();
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to delete account');
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Delete Account</h1>
          <p className="text-gray-600">Permanently delete your account and all associated data</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-red-200">
          <div className="mb-6">
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <h2 className="text-lg font-semibold text-red-900 mb-2">Warning: This action cannot be undone</h2>
              <p className="text-red-700 text-sm mb-2">
                Deleting your account will permanently remove:
              </p>
              <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                <li>Your account information</li>
                <li>All your job postings</li>
                <li>Your company profile</li>
                <li>All applications and associated data</li>
                <li>All other account-related data</li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type <span className="font-mono font-bold">DELETE</span> to confirm *
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => {
                  setConfirmText(e.target.value);
                  setError('');
                }}
                placeholder="DELETE"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={loading || confirmText !== 'DELETE'}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Deleting...' : 'Delete My Account'}
            </button>
            <Link
              href="/recruiter"
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 font-semibold text-center"
            >
              Cancel
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
