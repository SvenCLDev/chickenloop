'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '../components/Navbar';
import Link from 'next/link';
import { authApi } from '@/lib/api';

export default function ResetPasswordRequiredPage() {
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';
  const [email, setEmail] = useState(emailFromUrl);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setEmail((prev) => prev || emailFromUrl);
  }, [emailFromUrl]);

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const emailToUse = email.trim().toLowerCase();
    if (!emailToUse) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword({ email: emailToUse });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-900">
            Password Reset Required
          </h1>
          <p className="text-gray-700 text-center mb-6">
            Your account was migrated. You must reset your password before continuing.
          </p>
          {emailFromUrl && (
            <p className="text-sm text-gray-600 text-center mb-4">
              Account: <span className="font-medium text-gray-900">{emailFromUrl}</span>
            </p>
          )}
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              If an account exists with that email, a password reset link has been sent. Please check your inbox.
            </div>
          )}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleSendResetEmail} className="space-y-4">
            {!emailFromUrl && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? 'Sending...' : 'Send password reset email'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600">
            <Link href="/login" className="text-blue-600 hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
