'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Navbar from '@/app/components/Navbar';
import { useAuth } from '@/app/contexts/AuthContext';

type RoleChoice = 'job_seeker' | 'recruiter';

export default function RoleOnboardingPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [loadingRole, setLoadingRole] = useState<RoleChoice | null>(null);
  const [error, setError] = useState<string>('');

  const setRole = async (role: RoleChoice) => {
    setError('');
    setLoadingRole(role);
    try {
      const res = await fetch('/api/users/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to set role.');
        return;
      }
      await refreshUser();
      router.replace(data?.redirectTo || '/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set role.');
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to ChickenLoop</h1>
          <p className="text-gray-600 mb-6">Choose how you want to use ChickenLoop.</p>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setRole('job_seeker')}
              disabled={!!loadingRole}
              className="w-full px-4 py-3 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingRole === 'job_seeker' ? 'Saving...' : 'Find a Job'}
            </button>
            <button
              type="button"
              onClick={() => setRole('recruiter')}
              disabled={!!loadingRole}
              className="w-full px-4 py-3 rounded-md bg-gray-900 text-white font-semibold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingRole === 'recruiter' ? 'Saving...' : 'Hire Talent'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

