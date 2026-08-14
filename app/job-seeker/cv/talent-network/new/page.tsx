'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { useAuth } from '@/app/contexts/AuthContext';
import TalentNetworkCvForm from '@/app/components/talentNetwork/TalentNetworkCvForm';
import { emptyTalentNetworkForm } from '@/app/components/talentNetwork/formTypes';
import { cvApi, talentNetworkApi } from '@/lib/api';

export default function TalentNetworkNewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [canEdit, setCanEdit] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    else if (user && user.role !== 'job-seeker') {
      router.push(`/${user.role === 'admin' ? 'admin' : 'recruiter'}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'job-seeker') {
      checkAccess();
    }
  }, [user]);

  const checkAccess = async () => {
    try {
      const access = await talentNetworkApi.getAccess();
      if (!access.canEdit) {
        setCanEdit(false);
        return;
      }
      try {
        await cvApi.get();
        router.replace('/job-seeker/cv/talent-network/edit');
        return;
      } catch {
        // no CV yet — ok to create
      }
      setCanEdit(true);
    } finally {
      setLoading(false);
    }
  };

  const initialForm = {
    ...emptyTalentNetworkForm(),
    fullName: user?.name || '',
    email: user?.email || '',
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
          <p className="text-gray-600 mb-6">The Talent Network editor is not enabled for your account.</p>
          <Link href="/job-seeker/cv/new" className="text-blue-600 hover:underline">
            Create classic CV instead
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Create Talent Network Profile</h1>
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          <TalentNetworkCvForm
            initialForm={initialForm}
            mode="create"
            onSubmit={async (payload) => {
              await cvApi.create(payload);
              router.push('/job-seeker');
            }}
          />
        </div>
      </main>
    </div>
  );
}
