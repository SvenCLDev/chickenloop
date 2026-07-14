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
  const magicWishQuestion = useMemo(
    () => survey.questions.find((q) => q.mapsTo === 'magicWish'),
    [survey]
  );
  const pricingStep = survey.pricingStep;

  const [primaryAnswer, setPrimaryAnswer] = useState('');
  const [secondaryAnswer, setSecondaryAnswer] = useState('');
  const [otherText, setOtherText] = useState('');
  const [freeText, setFreeText] = useState('');
  const [priceResponse, setPriceResponse] = useState('');
  const [earlyAccessAnswer, setEarlyAccessAnswer] = useState('');
  const [magicWish, setMagicWish] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const [requestedEarlyAccess, setRequestedEarlyAccess] = useState(false);

  const selectedPrimaryOption = useMemo(
    () => (primaryQuestion?.options || []).find((o) => o.value === primaryAnswer),
    [primaryQuestion, primaryAnswer]
  );
  const showOtherText = !!selectedPrimaryOption?.showOtherText;
  const showSecondary =
    !!secondaryQuestion &&
    (!secondaryQuestion.showWhenPrimaryAnswered || !!primaryAnswer);
  const showFreeText =
    !!freeTextQuestion &&
    (!freeTextQuestion.showWhenPrimaryAnswered || !!primaryAnswer);

  const showPricing =
    !!pricingStep &&
    !!secondaryAnswer &&
    pricingStep.showWhenPaymentInterest.includes(secondaryAnswer);

  const showEarlyAccess =
    showPricing &&
    !!priceResponse &&
    !!pricingStep?.earlyAccess.showWhenPriceResponse.includes(priceResponse);

  const showMagicWish =
    !!magicWishQuestion &&
    (!magicWishQuestion.showWhenSecondaryAnswered || !!secondaryAnswer) &&
    (!magicWishQuestion.showWhenPrimaryAnswered || !!primaryAnswer);

  const descriptionParagraphs = (survey.description || '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const pricingBodyParagraphs = (pricingStep?.body || '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const submitAction = async (
    action: 'complete' | 'remind_later' | 'dismiss',
    payload: Record<string, unknown> = {}
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
      if (action === 'complete') {
        setRequestedEarlyAccess(Boolean(payload.earlyAccessInterested));
        setCompleted(true);
        onSubmitted();
      } else {
        onSubmitted();
        onClose();
      }
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
    if (showOtherText && !otherText.trim()) {
      setError('Please tell us a bit more about “Other”.');
      return;
    }
    if (secondaryQuestion?.required && !secondaryAnswer) {
      setError('Please answer the second question.');
      return;
    }
    if (showPricing && !priceResponse) {
      setError('Please answer the pricing question.');
      return;
    }
    if (showEarlyAccess && !earlyAccessAnswer) {
      setError('Please answer the early access question.');
      return;
    }
    if (magicWishQuestion?.required && !magicWish.trim()) {
      setError('Please answer the final question.');
      return;
    }

    const earlyAccessInterested = showEarlyAccess ? earlyAccessAnswer === 'yes' : null;

    await submitAction('complete', {
      primaryAnswer,
      secondaryAnswer,
      otherText: showOtherText ? otherText.trim() : '',
      freeText,
      priceResponse: showPricing ? priceResponse : '',
      earlyAccessInterested,
      magicWish: magicWish.trim(),
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
        {completed ? (
          <div className="text-center py-4">
            <h2 id="recruiter-survey-title" className="text-2xl font-bold text-gray-900 mb-3">
              {survey.thankYouTitle || 'Thank you!'}
            </h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              {survey.thankYouMessage || 'Your feedback directly influences what we build next.'}
            </p>
            {requestedEarlyAccess && survey.thankYouEarlyAccessMessage && (
              <p className="text-gray-600 leading-relaxed mb-8">
                {survey.thankYouEarlyAccessMessage}
              </p>
            )}
            {!requestedEarlyAccess && <div className="mb-8" />}
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h2 id="recruiter-survey-title" className="text-2xl font-bold text-gray-900 mb-2">
              {survey.title}
            </h2>
            {descriptionParagraphs.length > 0 && (
              <div className="mb-6 space-y-3">
                {descriptionParagraphs.map((paragraph) => (
                  <p key={paragraph} className="text-gray-600 text-sm leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
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
                          onChange={() => {
                            setPrimaryAnswer(option.value);
                            if (!option.showOtherText) setOtherText('');
                          }}
                          className="mt-1"
                          disabled={submitting}
                        />
                        <span className="text-sm text-gray-800">{option.label}</span>
                      </label>
                    ))}
                  </div>

                  {showOtherText && (
                    <div className="mt-3">
                      <label
                        htmlFor="survey-other-text"
                        className="block text-sm font-medium text-gray-900 mb-2"
                      >
                        Please tell us more *
                      </label>
                      <textarea
                        id="survey-other-text"
                        value={otherText}
                        onChange={(e) => setOtherText(e.target.value)}
                        rows={3}
                        maxLength={2000}
                        disabled={submitting}
                        placeholder="Describe the problem…"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </fieldset>
              )}

              {showSecondary && secondaryQuestion && (
                <fieldset>
                  <legend className="block text-sm font-medium text-gray-900 mb-3">
                    {secondaryQuestion.label}
                    {secondaryQuestion.required ? ' *' : ''}
                  </legend>
                  <div className="space-y-2">
                    {(secondaryQuestion.options || []).map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-start gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-colors ${
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
                          onChange={() => {
                            setSecondaryAnswer(option.value);
                            setPriceResponse('');
                            setEarlyAccessAnswer('');
                          }}
                          className="mt-1"
                          disabled={submitting}
                        />
                        <span className="text-sm text-gray-800">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              {showFreeText && freeTextQuestion && (
                <div>
                  <label
                    htmlFor="survey-free-text"
                    className="block text-sm font-medium text-gray-900 mb-2"
                  >
                    {freeTextQuestion.label}
                    {freeTextQuestion.required ? ' *' : ''}
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

              {showPricing && pricingStep && (
                <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{pricingStep.headline}</h3>
                    <div className="mt-2 space-y-2">
                      {pricingBodyParagraphs.map((paragraph) => (
                        <p
                          key={paragraph}
                          className={`text-sm leading-relaxed ${
                            paragraph.startsWith('€')
                              ? 'text-xl font-bold text-gray-900'
                              : 'text-gray-700'
                          }`}
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>

                  <fieldset>
                    <legend className="block text-sm font-medium text-gray-900 mb-3">
                      {pricingStep.question} *
                    </legend>
                    <div className="space-y-2">
                      {pricingStep.options.map((option) => (
                        <label
                          key={option.value}
                          className={`flex items-start gap-3 rounded-md border bg-white px-3 py-2.5 cursor-pointer transition-colors ${
                            priceResponse === option.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="priceResponse"
                            value={option.value}
                            checked={priceResponse === option.value}
                            onChange={() => {
                              setPriceResponse(option.value);
                              setEarlyAccessAnswer('');
                            }}
                            className="mt-1"
                            disabled={submitting}
                          />
                          <span className="text-sm text-gray-800">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {showEarlyAccess && (
                    <fieldset>
                      <legend className="block text-sm font-medium text-gray-900 mb-3">
                        {pricingStep.earlyAccess.question} *
                      </legend>
                      <div className="flex flex-col sm:flex-row gap-2">
                        {pricingStep.earlyAccess.options.map((option) => (
                          <label
                            key={option.value}
                            className={`flex-1 flex items-center gap-2 rounded-md border bg-white px-3 py-2.5 cursor-pointer transition-colors ${
                              earlyAccessAnswer === option.value
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="earlyAccessAnswer"
                              value={option.value}
                              checked={earlyAccessAnswer === option.value}
                              onChange={() => setEarlyAccessAnswer(option.value)}
                              disabled={submitting}
                            />
                            <span className="text-sm text-gray-800">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}
                </div>
              )}

              {showMagicWish && magicWishQuestion && (
                <div>
                  {magicWishQuestion.headline && (
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {magicWishQuestion.headline}
                    </h3>
                  )}
                  <label
                    htmlFor="survey-magic-wish"
                    className="block text-sm font-medium text-gray-900 mb-2"
                  >
                    {magicWishQuestion.label}
                    {magicWishQuestion.required ? ' *' : ''}
                  </label>
                  <textarea
                    id="survey-magic-wish"
                    value={magicWish}
                    onChange={(e) => setMagicWish(e.target.value.slice(0, magicWishQuestion.maxLength || 1000))}
                    rows={5}
                    maxLength={magicWishQuestion.maxLength || 1000}
                    disabled={submitting}
                    placeholder={magicWishQuestion.placeholder || ''}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {magicWish.length}/{magicWishQuestion.maxLength || 1000}
                  </p>
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
          </>
        )}
      </div>
    </div>
  );
}
