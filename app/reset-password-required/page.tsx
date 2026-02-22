'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '../components/Navbar';
import Link from 'next/link';
import { authApi } from '@/lib/api';

function ResetPasswordRequiredContent() {
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';
  const sentRef = useRef(false);

  // Send reset email once when the page loads with an email (e.g. after login with PASSWORD_RESET_REQUIRED)
  useEffect(() => {
    const email = emailFromUrl.trim().toLowerCase();
    if (!email || sentRef.current) return;
    sentRef.current = true;
    authApi.forgotPassword({ email }).catch(() => {
      // Silently ignore; we still show the same message so we don't reveal whether the account exists
    });
  }, [emailFromUrl]);

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
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            If an account exists with that email, a password reset link has been sent. Please check your inbox.
          </div>
          <p className="text-center text-sm text-gray-600">
            <Link href="/login" className="text-blue-600 hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function ResetPasswordRequiredPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      }
    >
      <ResetPasswordRequiredContent />
    </Suspense>
  );
}
