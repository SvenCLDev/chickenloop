'use client';

import React from 'react';
import BoostModal from './BoostModal';

export interface FeatureJobModalProps {
  jobId: string;
  currentFeaturedUntil?: string | null;
  onClose: () => void;
}

export default function FeatureJobModal({
  jobId,
  currentFeaturedUntil,
  onClose,
}: FeatureJobModalProps) {
  return (
    <BoostModal
      type="job"
      entityId={jobId}
      currentFeaturedUntil={currentFeaturedUntil}
      onClose={onClose}
      title="Feature this job"
    />
  );
}
