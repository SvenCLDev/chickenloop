'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import Link from 'next/link';

interface JobSeekerLayoutProps {
  children: ReactNode;
}

export default function JobSeekerLayout({ children }: JobSeekerLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const [cvCount, setCvCount] = useState<number | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/cv/mine/count', { credentials: 'include' });
        const data = await res.json();
        if (res.ok && typeof data.count === 'number') {
          setCvCount(data.count);
        }
      } catch {
        setCvCount(null);
      }
    };
    fetchCount();
  }, []);

  const showBanner =
    !authLoading &&
    user?.role === 'job-seeker' &&
    cvCount === 0 &&
    !bannerDismissed;

  return (
    <>
      {showBanner && (
        <div className="rounded-lg bg-blue-50 border-l-4 border-blue-500 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-blue-900 flex-1">
            Create your CV so recruiters can reach out to you with job offers.
          </p>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/create-cv"
              className="inline-flex items-center px-5 py-2.5 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Create CV
            </Link>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-blue-600 hover:text-blue-800 p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
