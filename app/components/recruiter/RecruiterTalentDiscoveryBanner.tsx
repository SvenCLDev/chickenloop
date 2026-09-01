'use client';

import { useCallback, useSyncExternalStore } from 'react';
import Link from 'next/link';

export const RECRUITER_TALENT_DISCOVERY_DISMISSED_KEY = 'recruiter-talent-discovery-dismissed';

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getDismissedSnapshot(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(RECRUITER_TALENT_DISCOVERY_DISMISSED_KEY) === '1';
}

function emitDismissChange() {
  listeners.forEach((listener) => listener());
}

export default function RecruiterTalentDiscoveryBanner() {
  const dismissed = useSyncExternalStore(subscribe, getDismissedSnapshot, () => true);

  const dismiss = useCallback(() => {
    localStorage.setItem(RECRUITER_TALENT_DISCOVERY_DISMISSED_KEY, '1');
    emitDismissChange();
  }, []);

  if (dismissed) return null;

  return (
    <div className="mb-6 rounded-lg border-l-4 border-blue-500 bg-blue-50 px-5 py-4 shadow-sm">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm font-medium text-blue-900">
          Search watersports talent directly — browse instructor and crew profiles with filters for
          sport, certifications, and availability.
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/talent"
            className="inline-flex items-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Explore Talent
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="rounded p-1 text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Dismiss talent search banner"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
