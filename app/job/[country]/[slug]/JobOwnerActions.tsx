'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import FeatureJobModal from '@/app/components/FeatureJobModal';

export interface JobOwnerActionsProps {
  jobId: string;
  featuredUntil?: string | null;
  isFeatured: boolean;
}

export default function JobOwnerActions({
  jobId,
  featuredUntil,
  isFeatured,
}: JobOwnerActionsProps) {
  const [showFeatureModal, setShowFeatureModal] = useState(false);

  return (
    <>
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <span className="font-semibold text-blue-900">Job actions (visible to job owner only)</span>
          <Link
            href={`/recruiter/jobs/${jobId}/edit`}
            className="inline-flex items-center px-3 py-1.5 rounded border border-blue-300 bg-white text-blue-700 font-medium hover:bg-blue-50 hover:border-blue-400"
          >
            Edit Job
          </Link>
          {isFeatured ? (
            <button
              type="button"
              onClick={() => setShowFeatureModal(true)}
              className="inline-flex items-center px-3 py-1.5 rounded border border-blue-300 bg-white text-blue-700 font-medium hover:bg-blue-50 hover:border-blue-400"
            >
              Extend featured period
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowFeatureModal(true)}
              className="inline-flex items-center px-3 py-1.5 rounded border border-blue-300 bg-white text-blue-700 font-medium hover:bg-blue-50 hover:border-blue-400"
            >
              Feature this job
            </button>
          )}
        </div>
      </div>
      {showFeatureModal && (
        <FeatureJobModal
          jobId={jobId}
          currentFeaturedUntil={featuredUntil ?? null}
          onClose={() => setShowFeatureModal(false)}
        />
      )}
    </>
  );
}
