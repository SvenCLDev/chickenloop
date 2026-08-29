'use client';

import Link from 'next/link';

type TalentNetworkIntroModalProps = {
  open: boolean;
  editProfileHref: string;
  dismissing?: boolean;
  onCloseSession: () => void;
  onDismissPermanent: () => void;
};

const BENEFITS = [
  {
    title: 'Verified qualifications',
    description:
      'Upload certificates so Chickenloop can confirm your credentials (not just self-reported).',
  },
  {
    title: 'Confirmed work history',
    description:
      'References from past employers help recruiters trust your experience.',
  },
  {
    title: 'Focused for recruiters',
    description:
      'Only the information that matters for watersports hiring—no clutter.',
  },
];

export default function TalentNetworkIntroModal({
  open,
  editProfileHref,
  dismissing = false,
  onCloseSession,
  onDismissPermanent,
}: TalentNetworkIntroModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onCloseSession}
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 md:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto relative"
        role="dialog"
        aria-labelledby="talent-network-intro-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCloseSession}
          disabled={dismissing}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 id="talent-network-intro-title" className="text-xl font-bold text-gray-900 mb-3 pr-8">
          Your Talent Network profile is ready
        </h2>
        <p className="text-sm text-gray-600 mb-5">
          We&apos;ve upgraded your profile to the Verified Talent Network—designed so recruiters can
          find you faster and trust what they see.
        </p>

        <ul className="space-y-3 mb-5">
          {BENEFITS.map((benefit) => (
            <li key={benefit.title} className="flex gap-3">
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700"
                aria-hidden="true"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{benefit.title}</p>
                <p className="text-sm text-gray-600">{benefit.description}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="text-xs text-gray-500 mb-6">
          Your existing profile data has been carried over. Take a few minutes to review it and add
          any verification documents.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href={editProfileHref}
            onClick={onCloseSession}
            className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Review my profile
          </Link>
          <button
            type="button"
            onClick={onDismissPermanent}
            disabled={dismissing}
            className="w-full rounded-md px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-60"
          >
            {dismissing ? 'Saving…' : "Don't show again"}
          </button>
        </div>
      </div>
    </div>
  );
}
