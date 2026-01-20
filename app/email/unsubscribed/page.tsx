'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '../../components/Navbar';
import Link from 'next/link';

export default function UnsubscribedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    }>
      <UnsubscribedPageClient />
    </Suspense>
  );
}

function UnsubscribedPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  const category = searchParams.get('category');
  const userRole = searchParams.get('role');
  const updated = searchParams.get('updated') === 'true';
  const error = searchParams.get('error');

  // Determine dashboard URL based on role
  const dashboardUrl = userRole === 'recruiter' 
    ? '/recruiter?unsubscribed=true&category=' + encodeURIComponent(category || '')
    : userRole === 'job-seeker'
    ? '/job-seeker?unsubscribed=true&category=' + encodeURIComponent(category || '')
    : '/';

  // Countdown and redirect
  useEffect(() => {
    if (!updated) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push(dashboardUrl);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [updated, dashboardUrl, router]);

  const categoryName = category 
    ? category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    : 'these emails';

  const preferencesUrl = userRole === 'recruiter'
    ? '/recruiter/account/edit'
    : '/job-seeker/account/edit';

  // Handle errors
  if (error) {
    let errorTitle = 'Unsubscribe Error';
    let errorMessage = 'There was a problem processing your unsubscribe request.';

    if (error === 'missing_token') {
      errorMessage = 'Invalid unsubscribe link. The token is missing.';
    } else if (error === 'invalid_token' || error === 'expired_token') {
      errorTitle = error === 'expired_token' ? 'Link Expired' : 'Invalid Link';
      errorMessage = error === 'expired_token' 
        ? 'This unsubscribe link has expired. Please use a recent email or manage your preferences from your account settings.'
        : 'This unsubscribe link is invalid. Please use a recent email or manage your preferences from your account settings.';
    } else if (error === 'critical_not_allowed') {
      errorTitle = 'Cannot Unsubscribe';
      errorMessage = 'Critical transactional emails (such as password resets and account verification) cannot be disabled for security reasons.';
    } else if (error === 'system_not_allowed') {
      errorTitle = 'Cannot Unsubscribe';
      errorMessage = 'System emails (such as contact form submissions) cannot be disabled.';
    } else if (error === 'invalid_user') {
      errorMessage = 'Invalid user account. Please contact support if this issue persists.';
    } else if (error === 'server_error') {
      errorTitle = 'Server Error';
      errorMessage = 'An unexpected error occurred. Please try again later or manage your preferences from your account settings.';
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{errorTitle}</h1>
              <p className="text-lg text-gray-600">{errorMessage}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={preferencesUrl}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold text-center transition-colors"
              >
                Manage Email Preferences
              </Link>
              <Link
                href="/"
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-semibold text-center transition-colors"
              >
                Go to Homepage
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {updated ? 'You\'ve been unsubscribed' : 'Already Unsubscribed'}
            </h1>
            <p className="text-lg text-gray-600">
              {updated 
                ? `You have successfully unsubscribed from ${categoryName}.`
                : `You are already unsubscribed from ${categoryName}.`
              }
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <p className="text-gray-700 mb-4">
              <strong>What this means:</strong>
            </p>
            {category === 'important_transactional' ? (
              <p className="text-sm text-gray-600">
                You will no longer receive application update notifications. You can re-enable these emails at any time from your account settings.
              </p>
            ) : category === 'user_notification' ? (
              <p className="text-sm text-gray-600">
                You will no longer receive job alert emails. You can re-enable these emails at any time from your account settings.
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                You can manage your email preferences and re-enable emails at any time from your account settings.
              </p>
            )}
          </div>

          {updated && countdown > 0 && (
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Redirecting to your dashboard in {countdown} second{countdown !== 1 ? 's' : ''}...
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={dashboardUrl}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold text-center transition-colors"
            >
              Go to Dashboard
            </Link>
            <Link
              href={preferencesUrl}
              className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-semibold text-center transition-colors"
            >
              Manage Email Preferences
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
