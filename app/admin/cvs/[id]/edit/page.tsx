'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { useAuth } from '@/app/contexts/AuthContext';
import TalentNetworkCvForm from '@/app/components/talentNetwork/TalentNetworkCvForm';
import { emptyTalentNetworkForm } from '@/app/components/talentNetwork/formTypes';
import { adminApi, talentNetworkApi } from '@/lib/api';
import { cvToTalentNetworkForm } from '@/lib/talentNetwork/serializeForm';

export default function AdminEditCVPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const cvId = (params?.id as string) || '';
  const [initialForm, setInitialForm] = useState(emptyTalentNetworkForm());
  const [pictures, setPictures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [useTalentNetwork, setUseTalentNetwork] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    else if (user && user.role !== 'admin') {
      router.push(`/${user.role === 'recruiter' ? 'recruiter' : 'job-seeker'}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'admin' && cvId) {
      loadCV();
    }
  }, [user, cvId]);

  const loadCV = async () => {
    try {
      const access = await talentNetworkApi.getAccess();
      setUseTalentNetwork(access.enabled === true);
      const data = await adminApi.getCV(cvId);
      const cv = data.cv;
      if (useTalentNetwork || cv.profileSchemaVersion === 2) {
        setInitialForm(cvToTalentNetworkForm(cv));
      } else {
        setInitialForm({
          ...cvToTalentNetworkForm(cv),
          fullName: cv.fullName || '',
          email: cv.email || '',
          phone: cv.phone || '',
          address: cv.address || '',
          summary: cv.summary || '',
          experienceAndSkill: cv.experienceAndSkill || [],
          lookingForWorkInAreas: cv.lookingForWorkInAreas || [],
          experienceLevel: cv.experienceLevel || '',
          availability: cv.availability || '',
          published: cv.published !== false,
        });
      }
      setPictures(cv.pictures || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load CV');
    } finally {
      setLoading(false);
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

  if (!useTalentNetwork) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-600 mb-4">
            Enable <code className="text-sm bg-gray-100 px-1 rounded">TALENT_NETWORK_ENABLED=true</code> to use the Talent Network admin editor.
          </p>
          <Link href="/admin" className="text-blue-600 hover:underline">Back to admin</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <Link href="/admin" className="text-blue-600 hover:text-blue-800 text-sm">
          ← Back to Admin Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">Edit CV (Talent Network)</h1>
        <p className="text-gray-600 mb-8">Admin editor for Verified Talent Network profiles.</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">{error}</div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800">
            CV updated successfully.
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          <TalentNetworkCvForm
            initialForm={initialForm}
            initialPictures={pictures}
            mode="edit"
            showPublishedToggle
            submitLabel="Update CV"
            onSubmit={async (payload) => {
              await adminApi.updateCV(cvId, payload);
              setSuccess(true);
              setTimeout(() => router.push('/admin'), 2000);
            }}
          />
        </div>
      </main>
    </div>
  );
}
