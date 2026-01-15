'use client';

import React, { useEffect, useRef } from 'react';

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (coverNote: string) => void;
  isSubmitting?: boolean;
  coverNote: string;
  onCoverNoteChange: (value: string) => void;
  error?: string;
}

export default function ApplicationModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  coverNote,
  onCoverNoteChange,
  error,
}: ApplicationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Focus the textarea when modal opens
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, isSubmitting, onClose]);

  // Trap focus within modal
  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Prevent double submissions
    if (isSubmitting) return;
    
    // Client-side validation: max length check
    if (coverNote.length > 300) {
      return; // Validation error will be shown by parent component
    }
    
    onSubmit(coverNote);
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full"
        role="dialog"
        aria-modal="true"
        aria-labelledby="application-modal-title"
      >
        <h2
          id="application-modal-title"
          className="text-2xl font-bold text-gray-900 mb-2"
        >
          Send your application
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          You can add a short cover note for the recruiter (optional).
        </p>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              htmlFor="coverNote"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Cover note (optional)
            </label>
            <textarea
              ref={textareaRef}
              id="coverNote"
              value={coverNote}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= 300) {
                  onCoverNoteChange(value);
                }
              }}
              placeholder="1–2 sentences is enough"
              maxLength={300}
              rows={3}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 resize-y disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="mt-1 flex justify-end">
              <span
                className={`text-xs ${
                  coverNote.length > 280 ? 'text-orange-600' : 'text-gray-500'
                }`}
              >
                {coverNote.length} / 300
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              ref={cancelButtonRef}
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Sending...' : 'Send Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
