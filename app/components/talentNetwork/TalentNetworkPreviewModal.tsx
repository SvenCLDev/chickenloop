'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export const TALENT_PREVIEW_DISMISSED_KEY = 'chickenloop:talent-preview-dismissed';
export const TALENT_PREVIEW_SESSION_KEY = 'chickenloop:talent-preview-session-dismissed';

type TalentNetworkPreviewModalProps = {
  open: boolean;
  onCloseSession: () => void;
  onDismissPermanent: () => void;
};

export default function TalentNetworkPreviewModal({
  open,
  onCloseSession,
  onDismissPermanent,
}: TalentNetworkPreviewModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseSession();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onCloseSession]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onCloseSession}
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 md:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto relative"
        role="dialog"
        aria-labelledby="talent-network-preview-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCloseSession}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 id="talent-network-preview-title" className="text-xl font-bold text-gray-900 mb-3 pr-8">
          You&apos;re browsing a preview of the Talent Network
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Names are shown as initials and contact details stay private. Create a free profile or log
          in to see how instructors appear to recruiters.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/register"
            onClick={onCloseSession}
            className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create a free profile
          </Link>
          <Link
            href="/login"
            onClick={onCloseSession}
            className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Log in
          </Link>
          <button
            type="button"
            onClick={onDismissPermanent}
            className="w-full rounded-md px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Don&apos;t show again
          </button>
        </div>
      </div>
    </div>
  );
}
