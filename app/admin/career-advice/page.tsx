'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminCareerAdviceRedirect() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'admin') {
        router.push(`/${user.role === 'recruiter' ? 'recruiter' : 'job-seeker'}`);
      } else {
        // Redirect to admin dashboard with career-advice section active
        router.replace('/admin?section=career-advice');
      }
    }
  }, [user, authLoading, router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-lg text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
