'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { useAuth } from '@/app/contexts/AuthContext';
import TalentNetworkCvForm from '@/app/components/talentNetwork/TalentNetworkCvForm';
import { emptyTalentNetworkForm } from '@/app/components/talentNetwork/formTypes';
import { cvApi, talentNetworkApi } from '@/lib/api';
import { cvToTalentNetworkForm } from '@/lib/talentNetwork/serializeForm';

export default function TalentNetworkEditPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [canEdit, setCanEdit] = useState<boolean | null>(null);
  const [initialForm, setInitialForm] = useState(emptyTalentNetworkForm());
  const [pictures, setPictures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    else if (user && user.role !== 'job-seeker') {
      router.push(`/${user.role === 'admin' ? 'admin' : 'recruiter'}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'job-seeker') {
      loadPage();
    }
  }, [user]);

  const loadPage = async () => {
    try {
      const access = await talentNetworkApi.getAccess();
      if (!access.canEdit) {
        setCanEdit(false);
        return;
      }
      setCanEdit(true);
      const data = await cvApi.get();
      setInitialForm(cvToTalentNetworkForm(data.cv));
      setPictures(data.cv.pictures || []);
    } catch {
      router.push('/job-seeker/cv/new');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading || canEdit === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">Loading...</div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Talent Network beta</h1>
          <p className="text-gray-600 mb-6">
            The new profile editor is not enabled for your account yet.
          </p>
          <Link href="/job-seeker/cv/edit" className="text-blue-600 hover:underline">
            Continue with classic CV editor
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <Link href="/job-seeker" className="text-blue-600 hover:text-blue-800 text-sm">
          ← Back to dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">Verified Talent Network Profile</h1>
        <p className="text-gray-600 mb-8">
          Build a watersports-focused profile with verifiable certificates, seasonal experience, and language skills.
        </p>

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800">
            Profile saved successfully.
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          <TalentNetworkCvForm
            initialForm={initialForm}
            initialPictures={pictures}
            mode="edit"
            onSubmit={async (payload) => {
              await cvApi.update(payload);
              setSuccess(true);
              setTimeout(() => router.push('/job-seeker'), 2000);
            }}
          />
        </div>
      </main>
    </div>
  );
}
