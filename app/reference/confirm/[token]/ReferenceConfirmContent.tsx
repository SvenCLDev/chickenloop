'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Navbar from '@/app/components/Navbar';

export default function ReferenceConfirmContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = (params?.token as string) || '';
  const [info, setInfo] = useState<{
    candidateName: string;
    schoolName: string;
    seasonLabel?: string;
    responded: boolean;
    rehire?: boolean;
  } | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submitResponse = useCallback(
    async (rehire: boolean) => {
      if (!token) return;
      setSubmitting(true);
      setError('');
      try {
        const res = await fetch(`/api/reference/confirm/${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rehire }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to submit response');
        setDone(true);
        setInfo((prev) => (prev ? { ...prev, responded: true, rehire } : prev));
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
          return;
        }

        const rehireParam = searchParams.get('rehire');
        if (rehireParam === 'yes' || rehireParam === 'no') {
          await submitResponse(rehireParam === 'yes');
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
  }, [token, searchParams, submitResponse]);

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
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Reference confirmation</h1>
              <p className="text-gray-600 mb-6">
                Did <strong>{info.candidateName}</strong> work at{' '}
                <strong>{info.schoolName}</strong>
                {info.seasonLabel ? ` (${info.seasonLabel})` : ''}? Would you rehire them?
              </p>

              {done ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800">
                  Thank you — your response has been recorded.
                  {info.rehire !== undefined && (
                    <span className="block mt-1 text-sm">
                      Response: {info.rehire ? 'Would rehire' : 'Would not rehire'}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => submitResponse(true)}
                    className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Yes, I would rehire them
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => submitResponse(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    No
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
