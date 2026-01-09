'use client';

import React, { useState } from 'react';

interface JobSpamButtonProps {
  jobId: string;
  spamStatus?: 'yes' | 'no';
}

export default function JobSpamButton({ jobId, spamStatus }: JobSpamButtonProps) {
  const [reportingSpam, setReportingSpam] = useState(false);
  const [spamReported, setSpamReported] = useState(spamStatus === 'yes');

  const handleReportSpam = async () => {
    if (spamReported) return;
    
    setReportingSpam(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/report-spam`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setSpamReported(true);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to report spam. Please try again.');
      }
    } catch (err: any) {
      alert('Failed to report spam. Please try again.');
    } finally {
      setReportingSpam(false);
    }
  };

  return (
    <button
      onClick={handleReportSpam}
      disabled={reportingSpam || spamReported}
      className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${spamReported
          ? 'bg-red-100 text-red-700 cursor-not-allowed'
          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
      }`}
    >
      {spamReported ? '✓ Reported as Spam' : reportingSpam ? 'Reporting...' : '🚩 Report as Spam'}
    </button>
  );
}

