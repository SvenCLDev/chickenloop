'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import {
  parseReferenceConfirmParams,
  type ReferenceConfirmInput,
} from '@/lib/referenceVerificationToken';

type Outcome = 'worked-rehire' | 'worked-no-rehire' | 'not-worked' | null;

function outcomeFromInput(input: ReferenceConfirmInput): Outcome {
  if (!input.worked) return 'not-worked';
  if (input.rehire === true) return 'worked-rehire';
  if (input.rehire === false) return 'worked-no-rehire';
  return null;
}

function outcomeFromStored(worked?: boolean, rehire?: boolean): Outcome {
  if (worked === false) return 'not-worked';
  if (rehire === true) return 'worked-rehire';
  if (rehire === false) return 'worked-no-rehire';
  return null;
}

export default function ReferenceConfirmContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = (params?.token as string) || '';
  const emailIntent = useMemo(
    () =>
      parseReferenceConfirmParams({
        worked: searchParams.get('worked'),
        rehire: searchParams.get('rehire'),
      }),
    [searchParams]
  );

  const [info, setInfo] = useState<{
    candidateName: string;
    schoolName: string;
    seasonLabel?: string;
    responded: boolean;
    entryRemoved?: boolean;
    worked?: boolean;
    rehire?: boolean;
  } | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [recordedOutcome, setRecordedOutcome] = useState<Outcome>(null);

  const submitResponse = useCallback(
    async (response: ReferenceConfirmInput) => {
      if (!token) return;
      setSubmitting(true);
      setError('');
      try {
        const res = await fetch(`/api/reference/confirm/${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.code === 'experience_removed') {
            setInfo((prev) =>
              prev
                ? { ...prev, entryRemoved: true, responded: false }
                : {
                    candidateName: data.candidateName ?? 'the candidate',
                    schoolName: data.schoolName ?? 'this center',
                    responded: false,
                    entryRemoved: true,
                  }
            );
            return;
          }
          throw new Error(data.error || 'Failed to submit response');
        }
        const outcome = outcomeFromInput(response);
        setDone(true);
        setRecordedOutcome(outcome);
        setInfo((prev) =>
          prev
            ? {
                ...prev,
                responded: true,
                entryRemoved: false,
                worked: response.worked,
                rehire: response.rehire,
              }
            : prev
        );
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to submit response');
      } finally {
        setSubmitting(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    fetch(`/api/reference/confirm/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Invalid link');
        if (cancelled) return;

        setInfo(data);
        if (data.responded) {
          setDone(true);
          setRecordedOutcome(outcomeFromStored(data.worked, data.rehire));
          return;
        }

        if (data.entryRemoved) {
          return;
        }

        if (emailIntent) {
          await submitResponse(emailIntent);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load reference request');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, emailIntent, submitResponse]);

  const entryRemoved = info?.entryRemoved === true;
  const showManualPrompt =
    !done && !entryRemoved && !submitting && (emailIntent === null || !!error);
  const showEmailProcessing =
    !done && !entryRemoved && emailIntent !== null && submitting && !error;
  const outcome = recordedOutcome ?? outcomeFromStored(info?.worked, info?.rehire);
  const periodSuffix = info?.seasonLabel ? ` (${info.seasonLabel})` : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
              {error}
            </div>
          )}

          {!info && !error && <p className="text-gray-600">Loading reference request...</p>}

          {info && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {entryRemoved ? 'Reference request no longer active' : 'Reference confirmation'}
              </h1>

              {entryRemoved ? (
                <div className="p-4 border border-amber-200 rounded-md bg-amber-50 text-amber-950">
                  <p className="text-sm leading-relaxed">
                    The work experience for <strong>{info.candidateName}</strong> at{' '}
                    <strong>{info.schoolName}</strong>
                    {periodSuffix} is no longer on their Chickenloop profile. It was most likely
                    removed or updated after this reference email was sent.
                  </p>
                  <p className="mt-3 text-sm leading-relaxed">
                    No action is needed on your part. If you still need to confirm their employment,
                    ask <strong>{info.candidateName}</strong> to add the experience back and send a
                    new reference request.
                  </p>
                </div>
              ) : done ? (
                <div
                  className={`p-4 border rounded-md ${
                    outcome === 'not-worked'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  <p className="font-medium">Thank you — your response has been recorded.</p>
                  <p className="mt-2 text-sm">
                    {outcome === 'worked-rehire' &&
                      `You confirmed that ${info.candidateName} worked at ${info.schoolName}${periodSuffix} and that you would rehire them.`}
                    {outcome === 'worked-no-rehire' &&
                      `You confirmed that ${info.candidateName} worked at ${info.schoolName}${periodSuffix}, but you would not rehire them.`}
                    {outcome === 'not-worked' &&
                      `You indicated that ${info.candidateName} did not work at ${info.schoolName}${periodSuffix}. Their employment at this center will not be shown as verified.`}
                  </p>
                </div>
              ) : showEmailProcessing ? (
                <p className="text-gray-600">Recording your response...</p>
              ) : showManualPrompt ? (
                <>
                  <p className="text-gray-600 mb-6">
                    Can you please confirm if <strong>{info.candidateName}</strong> worked at{' '}
                    <strong>{info.schoolName}</strong>
                    {info.seasonLabel ? ` during ${info.seasonLabel}` : ''} and, if they did, if you
                    would rehire them?
                  </p>
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => submitResponse({ worked: true, rehire: true })}
                      className="w-full px-4 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 text-left"
                    >
                      Yes, they worked here — I would rehire them
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => submitResponse({ worked: true, rehire: false })}
                      className="w-full px-4 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 text-left"
                    >
                      Yes, they worked here — I would not rehire them
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => submitResponse({ worked: false })}
                      className="w-full px-4 py-3 border border-red-300 text-red-800 rounded-md hover:bg-red-50 disabled:opacity-50 text-left"
                    >
                      No, they did not work at our center
                    </button>
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
