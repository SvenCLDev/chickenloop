'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '../../components/Navbar';

/**
 * Safe landing page for Stripe success or cancel redirects.
 * Does NOT create or edit any data — only reads search params and shows messages.
 */
function StripeReturnContent() {
  const searchParams = useSearchParams();
  const checkout = searchParams.get('checkout');
  const type = searchParams.get('type');

  const isSuccess = checkout === 'success';
  const isCancelled =
    checkout === 'cancel' || checkout === 'cancelled';
  const isCvBoost = type === 'cv_boost';

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-16">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <Image
                src="/success-chicken.gif"
                alt="Success"
                width={128}
                height={128}
                unoptimized
                className="object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isCvBoost ? 'Your CV boost was successful.' : 'Your job boost was successful.'}
            </h1>
            <p className="text-gray-600 mb-8">
              {isCvBoost ? 'Your CV will be featured shortly.' : 'Your listing will be featured shortly.'}
            </p>
            <Link
              href={isCvBoost ? '/job-seeker' : '/recruiter'}
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
            >
              {isCvBoost ? 'Go to my dashboard' : 'Go to My Jobs'}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (isCancelled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-16">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Checkout cancelled
            </h1>
            <p className="text-gray-600 mb-8">
              You left checkout before completing payment. No charges were made.
            </p>
            <Link
              href="/recruiter"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Return from checkout
          </h1>
          <p className="text-gray-600 mb-8">
            Use the button below to return to your jobs.
          </p>
          <Link
            href={type === 'cv_boost' ? '/job-seeker' : '/recruiter'}
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
          >
            {type === 'cv_boost' ? 'Go to my dashboard' : 'Go to My Jobs'}
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function StripeReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
          <Navbar />
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-gray-500">Loading...</div>
          </div>
        </div>
      }
    >
      <StripeReturnContent />
    </Suspense>
  );
}
