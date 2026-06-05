'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SaveJobAlertModal, { SaveJobAlertLoginPrompt } from './SaveJobAlertModal';
import JobAlertToast from './JobAlertToast';
import {
  buildFiltersFromJobAttributes,
  hasSavableAlertFilters,
  type JobAlertSourceAttributes,
} from './savedSearchUtils';

interface JobSimilarJobsAlertButtonProps extends JobAlertSourceAttributes {
  categoryLabel?: string;
  countryLabel?: string;
}

export default function JobSimilarJobsAlertButton({
  category,
  activity,
  country,
  language,
  categoryLabel,
  countryLabel,
}: JobSimilarJobsAlertButtonProps) {
  const { user, loading: authLoading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filters = useMemo(
    () => buildFiltersFromJobAttributes({ category, activity, country, language }),
    [category, activity, country, language]
  );

  const canShow = useMemo(() => hasSavableAlertFilters(filters), [filters]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  if (!canShow) return null;

  const handleClick = () => {
    if (authLoading) return;
    if (!user || user.role !== 'job-seeker') {
      setLoginOpen(true);
      return;
    }
    setModalOpen(true);
  };

  return (
    <>
      <JobAlertToast message={toastMessage} />
      <button
        type="button"
        onClick={handleClick}
        disabled={authLoading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Alert me about similar jobs"
      >
        <span>🔔 Alert me about similar jobs</span>
      </button>

      <SaveJobAlertModal
        open={modalOpen}
        filters={filters}
        alertNameLabels={{ category: categoryLabel, country: countryLabel }}
        description="Get email notifications when new jobs similar to this one are posted."
        onClose={() => setModalOpen(false)}
        onSuccess={() => setToastMessage('Job alert created successfully.')}
      />
      <SaveJobAlertLoginPrompt open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
