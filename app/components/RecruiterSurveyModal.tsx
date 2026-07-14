'use client';

import { useMemo, useState } from 'react';
import type { SurveyDefinition } from '@/lib/surveys';

interface RecruiterSurveyModalProps {
  survey: SurveyDefinition;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function RecruiterSurveyModal({
  survey,
  onClose,
  onSubmitted,
}: RecruiterSurveyModalProps) {
  const primaryQuestion = useMemo(
    () => survey.questions.find((q) => q.mapsTo === 'primaryAnswer'),
    [survey]
  );
  const secondaryQuestion = useMemo(
    () => survey.questions.find((q) => q.mapsTo === 'secondaryAnswer'),
    [survey]
  );
  const freeTextQuestion = useMemo(
    () => survey.questions.find((q) => q.mapsTo === 'freeText'),
    [survey]
  );

  const [primaryAnswer, setPrimaryAnswer] = useState('');
  const [secondaryAnswer, setSecondaryAnswer] = useState('');
  const [freeText, setFreeText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submitAction = async (
    action: 'complete' | 'remind_later' | 'dismiss',
    payload: Record<string, string> = {}
  ) => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/surveys/respond', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId: survey.id,
          action,
          ...payload,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save response');
      }
      onSubmitted();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save response');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (primaryQuestion?.required && !primaryAnswer) {
      setError('Please answer the first question.');
      return;
    }
    if (secondaryQuestion?.required && !secondaryAnswer) {
      setError('Please answer the early access question.');
      return;
    }
    await submitAction('complete', {
      primaryAnswer,
      secondaryAnswer,
      freeText,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recruiter-survey-title"
      >
        <h2 id="recruiter-survey-title" className="text-2xl font-bold text-gray-900 mb-2">
          {survey.title}
        </h2>
        {survey.description && (
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">{survey.description}</p>
        )}

        <div className="space-y-6">
          {primaryQuestion && (
            <fieldset>
              <legend className="block text-sm font-medium text-gray-900 mb-3">
                {primaryQuestion.label}
                {primaryQuestion.required ? ' *' : ''}
              </legend>
              <div className="space-y-2">
                {(primaryQuestion.options || []).map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-colors ${
                      primaryAnswer === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="primaryAnswer"
                      value={option.value}
                      checked={primaryAnswer === option.value}
                      onChange={() => setPrimaryAnswer(option.value)}
                      className="mt-1"
                      disabled={submitting}
                    />
                    <span className="text-sm text-gray-800">{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {secondaryQuestion && (
            <fieldset>
              <legend className="block text-sm font-medium text-gray-900 mb-3">
                {secondaryQuestion.label}
                {secondaryQuestion.required ? ' *' : ''}
              </legend>
              <div className="flex flex-col sm:flex-row gap-2">
                {(secondaryQuestion.options || []).map((option) => (
                  <label
                    key={option.value}
                    className={`flex-1 flex items-center gap-2 rounded-md border px-3 py-2.5 cursor-pointer transition-colors ${
                      secondaryAnswer === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="secondaryAnswer"
                      value={option.value}
                      checked={secondaryAnswer === option.value}
                      onChange={() => setSecondaryAnswer(option.value)}
                      disabled={submitting}
                    />
                    <span className="text-sm text-gray-800">{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {freeTextQuestion && (
            <div>
              <label
                htmlFor="survey-free-text"
                className="block text-sm font-medium text-gray-900 mb-2"
              >
                {freeTextQuestion.label}
              </label>
              <textarea
                id="survey-free-text"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                rows={3}
                maxLength={2000}
                disabled={submitting}
                placeholder={freeTextQuestion.placeholder || ''}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleComplete}
            disabled={submitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Complete Survey'}
          </button>
          <button
            type="button"
            onClick={() => submitAction('remind_later')}
            disabled={submitting}
            className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Remind me next week
          </button>
          <button
            type="button"
            onClick={() => submitAction('dismiss')}
            disabled={submitting}
            className="w-full rounded-md px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-60"
          >
            Don&apos;t ask again
          </button>
        </div>
      </div>
    </div>
  );
}
