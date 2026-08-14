'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { useAuth } from '@/app/contexts/AuthContext';
import { adminApi } from '@/lib/api';
import { ISSUING_BODY_LABELS } from '@/lib/talentNetwork/constants';

interface QueueItem {
  cvId: string;
  certId: string;
  candidateName: string;
  candidateEmail: string;
  certificate: {
    issuingBody: string;
    certificateLevel: string;
    disciplines?: string[];
    licenseMemberId?: string;
    issueDate?: string;
    expiryDate?: string;
    documentUrl?: string;
    verificationStatus: string;
  };
}

interface VerificationStats {
  pendingCerts: number;
  confirmedReferences: number;
  betaUsers: number;
  verifiedCerts: number;
}

export default function AdminVerificationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'admin') {
      router.push(`/${user.role === 'recruiter' ? 'recruiter' : 'job-seeker'}`);
    }
  }, [user, authLoading, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [queueData, statsData] = await Promise.all([
        adminApi.getVerificationQueue(),
        adminApi.getVerificationStats(),
      ]);
      setQueue(queueData.queue ?? []);
      setStats(statsData);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load verification queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadData();
    }
  }, [user]);

  const handleAction = async (
    cvId: string,
    certId: string,
    action: 'verify' | 'reject'
  ) => {
    const key = `${cvId}:${certId}`;
    setActionId(key);
    try {
      await adminApi.updateCertificateVerification(cvId, certId, { action });
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-6">
          <Link href="/admin" className="text-blue-600 hover:text-blue-800">
            ← Back to Admin Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Certificate Verification</h1>
          <p className="text-gray-600 mt-2">
            Review uploaded credentials and mark them as Chickenloop Verified.
          </p>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Pending review" value={stats.pendingCerts} />
            <StatCard label="Verified certs" value={stats.verifiedCerts} />
            <StatCard label="Confirmed references" value={stats.confirmedReferences} />
            <StatCard label="Beta job seekers" value={stats.betaUsers} />
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
            {error}
          </div>
        )}

        {queue.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
            No certificates pending review.
          </div>
        ) : (
          <div className="space-y-6">
            {queue.map((item) => {
              const bodyLabel =
                ISSUING_BODY_LABELS[
                  item.certificate.issuingBody as keyof typeof ISSUING_BODY_LABELS
                ] ?? item.certificate.issuingBody;
              const isPdf = item.certificate.documentUrl?.toLowerCase().includes('.pdf');
              const actionKey = `${item.cvId}:${item.certId}`;
              return (
                <div key={actionKey} className="bg-white rounded-lg shadow p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {item.candidateName}
                      </h2>
                      <p className="text-sm text-gray-500 mb-4">{item.candidateEmail}</p>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="font-medium text-gray-700">Issuing body</dt>
                          <dd>{bodyLabel}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-700">Level</dt>
                          <dd>{item.certificate.certificateLevel}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-700">Disciplines</dt>
                          <dd>{(item.certificate.disciplines ?? []).join(', ') || '—'}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-700">License / Member ID</dt>
                          <dd>{item.certificate.licenseMemberId || '—'}</dd>
                        </div>
                      </dl>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                          href={`/admin/cvs/${item.cvId}/edit`}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Edit CV
                        </Link>
                        <Link
                          href={`/candidates/${item.cvId}`}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View public profile
                        </Link>
                      </div>
                    </div>
                    <div className="lg:w-80">
                      {item.certificate.documentUrl ? (
                        isPdf ? (
                          <iframe
                            src={item.certificate.documentUrl}
                            title="Certificate document"
                            className="w-full h-64 border rounded-md"
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.certificate.documentUrl}
                            alt="Certificate document"
                            className="w-full max-h-64 object-contain border rounded-md"
                          />
                        )
                      ) : (
                        <div className="h-64 border rounded-md flex items-center justify-center text-gray-500 text-sm">
                          No document uploaded
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleAction(item.cvId, item.certId, 'verify')}
                      disabled={actionId === actionKey}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {actionId === actionKey ? 'Saving...' : 'Verify'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction(item.cvId, item.certId, 'reject')}
                      disabled={actionId === actionKey}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
