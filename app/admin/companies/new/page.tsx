'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { adminApi } from '@/lib/api';
import Link from 'next/link';

type RecruiterOption = {
  id: string;
  name: string;
  email: string;
  companyName?: string | null;
};

export default function AdminSelectCompanyOwnerPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [recruiterSearch, setRecruiterSearch] = useState('');
  const [recruiterResults, setRecruiterResults] = useState<RecruiterOption[]>([]);
  const [recruiterDropdownOpen, setRecruiterDropdownOpen] = useState(false);
  const [recruiterSearching, setRecruiterSearching] = useState(false);
  const [selectedRecruiter, setSelectedRecruiter] = useState<RecruiterOption | null>(null);
  const [recruiterHasCompany, setRecruiterHasCompany] = useState<boolean | null>(null);
  const [error, setError] = useState('');

  const recruiterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recruiterContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'admin') {
      router.push(`/${user.role === 'recruiter' ? 'recruiter' : 'job-seeker'}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (recruiterSearch.trim().length < 2) {
      setRecruiterResults([]);
      setRecruiterDropdownOpen(false);
      return;
    }
    if (recruiterTimeoutRef.current) clearTimeout(recruiterTimeoutRef.current);
    recruiterTimeoutRef.current = setTimeout(async () => {
      setRecruiterSearching(true);
      try {
        const data = await adminApi.getUsers({ search: recruiterSearch.trim(), role: 'recruiter' });
        const list = (data.users || []).map(
          (u: { id: string; name: string; email: string; companyName?: string | null }) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            companyName: u.companyName ?? null,
          })
        );
        setRecruiterResults(list);
        setRecruiterDropdownOpen(list.length > 0);
      } catch {
        setRecruiterResults([]);
      } finally {
        setRecruiterSearching(false);
      }
    }, 300);
    return () => {
      if (recruiterTimeoutRef.current) clearTimeout(recruiterTimeoutRef.current);
    };
  }, [recruiterSearch]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (recruiterContainerRef.current && !recruiterContainerRef.current.contains(e.target as Node)) {
        setRecruiterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const loadRecruiterCompanyState = async (recruiterId: string) => {
    try {
      const data = await adminApi.getUser(recruiterId);
      setRecruiterHasCompany(Boolean(data?.user?.companyId));
    } catch {
      setRecruiterHasCompany(null);
    }
  };

  const pickRecruiter = (r: RecruiterOption) => {
    setSelectedRecruiter(r);
    setRecruiterSearch(`${r.name} (${r.email})`);
    setRecruiterDropdownOpen(false);
    setError('');
    void loadRecruiterCompanyState(r.id);
  };

  const handleContinue = () => {
    if (!selectedRecruiter) {
      setError('Please select a recruiter who will own this company.');
      return;
    }
    if (recruiterHasCompany) {
      setError('This recruiter already has a company. Choose a different recruiter or remove their existing company first.');
      return;
    }
    router.push(`/admin/companies/create/${selectedRecruiter.id}`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <Link
            href="/admin?section=companies"
            className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Companies
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Company</h1>
          <p className="text-gray-600 text-sm mb-6">
            Select the recruiter who will own this company. You will complete the company profile on the next step.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div ref={recruiterContainerRef} className="relative mb-6">
            <label htmlFor="recruiter-search" className="block text-sm font-medium text-gray-700 mb-1">
              Company owner (recruiter) *
            </label>
            <input
              id="recruiter-search"
              type="text"
              value={recruiterSearch}
              onChange={(e) => {
                setRecruiterSearch(e.target.value);
                setSelectedRecruiter(null);
                setRecruiterHasCompany(null);
              }}
              onFocus={() => recruiterResults.length > 0 && setRecruiterDropdownOpen(true)}
              placeholder="Search by name or email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
            />
            {recruiterSearching && (
              <p className="absolute right-3 top-9 text-xs text-gray-500">Searching...</p>
            )}
            {recruiterDropdownOpen && recruiterResults.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {recruiterResults.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => pickRecruiter(r)}
                      className="w-full text-left px-4 py-2 hover:bg-indigo-50 border-b border-gray-100 last:border-b-0 text-gray-900"
                    >
                      <span className="font-medium">{r.name}</span>
                      <span className="text-gray-500 text-sm ml-2">{r.email}</span>
                      {r.companyName && (
                        <span className="block text-xs text-gray-400">Company: {r.companyName}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selectedRecruiter && (
              <p className="mt-2 text-sm text-green-700">
                Selected: {selectedRecruiter.name} ({selectedRecruiter.email})
                {recruiterHasCompany === true && (
                  <span className="block text-amber-700 font-medium">This recruiter already has a company.</span>
                )}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleContinue}
              disabled={!selectedRecruiter || recruiterHasCompany === true}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Continue to company form
            </button>
            <Link
              href="/admin?section=companies"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
            >
              Cancel
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
