'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';

interface JobApplySectionProps {
  jobId: string;
  applyByEmail?: boolean;
  applyByWebsite?: boolean;
  applyByWhatsApp?: boolean;
  applicationEmail?: string;
  applicationWebsite?: string;
  applicationWhatsApp?: string;
}

export default function JobApplySection({
  jobId,
  applyByEmail,
  applyByWebsite,
  applyByWhatsApp,
  applicationEmail,
  applicationWebsite,
  applicationWhatsApp,
}: JobApplySectionProps) {
  const { user } = useAuth();
  const [hasApplied, setHasApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applicationError, setApplicationError] = useState('');
  const [checkingApplication, setCheckingApplication] = useState(false);

  useEffect(() => {
    if (user && user.role === 'job-seeker' && jobId) {
      checkApplicationStatus();
    }
  }, [user, jobId]);

  const checkApplicationStatus = async () => {
    if (!user || user.role !== 'job-seeker' || !jobId) return;
    
    setCheckingApplication(true);
    try {
      const response = await fetch(`/api/applications?jobId=${jobId}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setHasApplied(data.hasApplied || false);
      }
    } catch (err: any) {
      // Silently fail - not critical
    } finally {
      setCheckingApplication(false);
    }
  };

  const handleApply = async () => {
    if (!user || user.role !== 'job-seeker' || applying || hasApplied) return;
    
    setApplying(true);
    setApplicationError('');
    
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ jobId: jobId }),
      });

      const data = await response.json();

      if (response.ok) {
        setHasApplied(true);
        alert('Application submitted successfully!');
      } else {
        setApplicationError(data.error || 'Failed to submit application. Please try again.');
        alert(data.error || 'Failed to submit application. Please try again.');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to submit application. Please try again.';
      setApplicationError(errorMessage);
      alert(errorMessage);
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      {/* ATS Apply Button - Show for job seekers */}
      {user && user.role === 'job-seeker' && (
        <div className="mb-4">
          {hasApplied ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium">
              <span>✓</span>
              <span>Application Submitted</span>
            </div>
          ) : (
            <button
              onClick={handleApply}
              disabled={applying || checkingApplication}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {applying ? 'Submitting Application...' : checkingApplication ? 'Checking...' : 'Instant Application'}
            </button>
          )}
          {applicationError && (
            <p className="mt-2 text-sm text-red-600">{applicationError}</p>
          )}
        </div>
      )}

      {/* External Application Methods */}
      {(applyByEmail || applyByWebsite || applyByWhatsApp) && (
        <>
          {user && user.role === 'job-seeker' && (
            <p className="text-sm text-gray-600 mb-3">Or apply directly:</p>
          )}
          <div className="space-y-3">
            {applyByEmail && applicationEmail && (
              <div className="flex items-center gap-3">
                <span className="text-lg">📧</span>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="font-medium">By email:</span>
                  <a
                    href={`mailto:${applicationEmail}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {applicationEmail}
                  </a>
                </div>
              </div>
            )}
            {applyByWebsite && applicationWebsite && (
              <div className="flex items-center gap-3">
                <span className="text-lg">🌐</span>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="font-medium">Via our Website:</span>
                  <a
                    href={applicationWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {applicationWebsite}
                  </a>
                </div>
              </div>
            )}
            {applyByWhatsApp && applicationWhatsApp && (
              <div className="flex items-center gap-3">
                <span className="text-lg">💬</span>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="font-medium">By WhatsApp:</span>
                  <a
                    href={`https://wa.me/${applicationWhatsApp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {applicationWhatsApp}
                  </a>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Show message for non-logged-in users or non-job-seekers */}
      {(!user || user.role !== 'job-seeker') && !applyByEmail && !applyByWebsite && !applyByWhatsApp && (
        <p className="text-gray-600">
          {!user ? (
            <>
              Please <Link href="/login" className="text-blue-600 hover:underline">log in</Link> as a job seeker to apply.
            </>
          ) : (
            'Please contact the recruiter directly to apply for this position.'
          )}
        </p>
      )}
    </>
  );
}

