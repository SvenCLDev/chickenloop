'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ApplicationModal from '../../components/ApplicationModal';

interface JobApplySectionProps {
  jobId: string;
  companyName?: string;
  jobPublished?: boolean;
  applyByEmail?: boolean;
  applyByWebsite?: boolean;
  applyByWhatsApp?: boolean;
  applicationEmail?: string;
  applicationWebsite?: string;
  applicationWhatsApp?: string;
}

export default function JobApplySection({
  jobId,
  companyName,
  jobPublished = true,
  applyByEmail,
  applyByWebsite,
  applyByWhatsApp,
  applicationEmail,
  applicationWebsite,
  applicationWhatsApp,
}: JobApplySectionProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applicationError, setApplicationError] = useState('');
  const [checkingApplication, setCheckingApplication] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const [cv, setCv] = useState<any>(null);
  const [loadingCv, setLoadingCv] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (user && user.role === 'job-seeker' && jobId) {
      checkApplicationStatus();
      loadCV();
    }
  }, [user, jobId]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSuccessModal) {
        setShowSuccessModal(false);
      }
    };

    if (showSuccessModal) {
      document.addEventListener('keydown', handleEscape);
      // Focus the close button when modal opens
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showSuccessModal]);

  // Trap focus within modal
  useEffect(() => {
    if (!showSuccessModal) return;

    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      modal.removeEventListener('keydown', handleTabKey);
    };
  }, [showSuccessModal]);

  const loadCV = async () => {
    if (!user || user.role !== 'job-seeker') return;
    
    setLoadingCv(true);
    try {
      const response = await fetch('/api/cv', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setCv(data.cv || null);
      }
    } catch (err: any) {
      // Silently fail - not critical
      setCv(null);
    } finally {
      setLoadingCv(false);
    }
  };

  const checkApplicationStatus = async () => {
    if (!user || user.role !== 'job-seeker' || !jobId) return;
    
    setCheckingApplication(true);
    try {
      const response = await fetch(`/api/applications?jobId=${jobId}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        // Store application status (null if no application exists)
        // NOTE: Do NOT use application.published - it only controls dashboard visibility
        setApplicationStatus(data.applicationStatus || null);
      }
    } catch (err: any) {
      // Silently fail - not critical
      setApplicationStatus(null);
    } finally {
      setCheckingApplication(false);
    }
  };

  // Determine if user can apply based on all conditions
  const canApply = useMemo(() => {
    // Must be a job seeker
    if (!user || user.role !== 'job-seeker') return false;
    
    // Job must be published
    if (jobPublished !== true) return false;
    
    // CV must exist and be published (cv.published !== false)
    if (!cv || cv.published === false) return false;
    
    // Application status check:
    // - Show button if no application exists (applicationStatus === null)
    // - Show button if application.status === 'withdrawn'
    // - Hide button if application.status is: applied, viewed, contacted, interviewed, accepted, rejected
    const hideStatuses = ['applied', 'viewed', 'contacted', 'interviewed', 'accepted', 'rejected'];
    if (applicationStatus && hideStatuses.includes(applicationStatus)) {
      return false;
    }
    
    // Allow if no application or status is 'withdrawn'
    return applicationStatus === null || applicationStatus === 'withdrawn';
  }, [user, jobPublished, cv, applicationStatus]);

  // Determine the reason why user cannot apply (for helper text)
  const getCannotApplyReason = useMemo(() => {
    if (!user || user.role !== 'job-seeker') {
      return null; // Not a job seeker - don't show button at all
    }

    // Still loading - show loading state
    if (checkingApplication || loadingCv) {
      return null;
    }

    // Check CV first
    if (!cv) {
      return 'You need a published CV to apply. Please create and publish your CV first.';
    }
    if (cv.published === false) {
      return 'You need a published CV to apply. Please publish your CV in your dashboard.';
    }

    // Check application status
    const hideStatuses = ['applied', 'viewed', 'contacted', 'interviewed', 'accepted', 'rejected'];
    if (applicationStatus && hideStatuses.includes(applicationStatus)) {
      if (applicationStatus === 'applied') {
        return 'You already applied for this job';
      } else if (applicationStatus === 'accepted') {
        return 'Your application has been accepted';
      } else if (applicationStatus === 'rejected') {
        return 'Your application has been rejected';
      } else {
        return 'Your application is under review';
      }
    }

    // Job not published (shouldn't happen if we're on the page, but handle it)
    if (jobPublished !== true) {
      return 'This job is no longer available';
    }

    return null; // Can apply
  }, [user, jobPublished, cv, applicationStatus, checkingApplication, loadingCv]);

  const handleOpenApplicationModal = () => {
    if (!canApply || applying || checkingApplication || loadingCv) return;
    setShowApplicationModal(true);
    setApplicationError('');
    // Reset coverNote when opening modal
    setCoverNote('');
  };

  const handleCloseApplicationModal = () => {
    setShowApplicationModal(false);
    // Reset coverNote when modal closes
    setCoverNote('');
  };

  const handleSubmitApplication = async (coverNote: string) => {
    // Prevent double submissions
    if (!canApply || applying) return;
    
    // Client-side validation: max length check
    const trimmedNote = coverNote.trim();
    if (trimmedNote.length > 300) {
      setApplicationError('Cover note must not exceed 300 characters');
      return;
    }
    
    setApplying(true);
    setApplicationError('');
    
    try {
      const requestBody: { jobId: string; coverNote?: string } = { jobId: jobId };
      // Only include coverNote if it's not empty (after trimming)
      if (trimmedNote) {
        requestBody.coverNote = trimmedNote;
      }
      
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        // On success: close application modal first, then show success popup
        setShowApplicationModal(false);
        // Update application status to 'applied'
        setApplicationStatus('applied');
        // Reset coverNote when submission succeeds
        setCoverNote('');
        // Show success popup after a brief delay to ensure application modal is closed
        setTimeout(() => {
          setShowSuccessModal(true);
        }, 100);
      } else {
        const errorMessage = data.error || 'Failed to submit application. Please try again.';
        setApplicationError(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to submit application. Please try again.';
      setApplicationError(errorMessage);
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      {/* ATS Apply Button - Show for job seekers */}
      {user && user.role === 'job-seeker' && (
        <div className="mb-4">
          {checkingApplication || loadingCv ? (
            <button
              disabled
              className="px-6 py-3 bg-gray-400 text-white rounded-lg font-semibold cursor-not-allowed opacity-50"
            >
              Checking...
            </button>
          ) : canApply ? (
            <button
              onClick={handleOpenApplicationModal}
              disabled={applying}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {applying ? 'Submitting...' : 'Instant Application'}
            </button>
          ) : (
            <div className="space-y-2">
              <button
                disabled
                className="px-6 py-3 bg-gray-400 text-white rounded-lg font-semibold cursor-not-allowed opacity-50"
                title={getCannotApplyReason || ''}
              >
                Instant Application
              </button>
              {getCannotApplyReason && (
                <p className="text-sm text-gray-600 italic">
                  {getCannotApplyReason}
                </p>
              )}
            </div>
          )}
          {applicationError && (
            <p className="mt-2 text-sm text-red-600">{applicationError}</p>
          )}
        </div>
      )}

      {/* Application Modal */}
      <ApplicationModal
        isOpen={showApplicationModal}
        onClose={handleCloseApplicationModal}
        onSubmit={handleSubmitApplication}
        isSubmitting={applying}
        coverNote={coverNote}
        onCoverNoteChange={setCoverNote}
        error={applicationError}
      />

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

      {/* Success Modal - Appears after application modal closes */}
      {showSuccessModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSuccessModal(false);
            }
          }}
        >
          <div 
            ref={modalRef}
            className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-modal-title"
          >
            <div className="mb-4 flex justify-center items-center" style={{ minHeight: '120px' }}>
              <img
                src="/success-chicken.gif"
                alt="Application submitted successfully"
                className="max-w-[160px] w-auto h-auto"
                style={{ maxHeight: '160px', display: 'block', objectFit: 'contain' }}
                onError={(e) => {
                  console.error('Failed to load success GIF:', e);
                }}
              />
            </div>
            <h2 
              id="success-modal-title"
              className="text-2xl font-bold text-gray-900 mb-4"
            >
              Application submitted successfully!
            </h2>
            <p className="text-gray-600 mb-6">
              {companyName ? (
                <>
                  The <strong>{companyName}</strong> has been informed about your application.
                  <br />
                  You can track the status on your dashboard in the <strong>My Applications</strong> section.
                </>
              ) : (
                <>
                  The employer has been informed about your application.
                  <br />
                  You can track the status on your dashboard in the <strong>My Applications</strong> section.
                </>
              )}
            </p>
            <button
              ref={closeButtonRef}
              onClick={() => {
                setShowSuccessModal(false);
                router.push('/job-seeker');
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </>
  );
}


