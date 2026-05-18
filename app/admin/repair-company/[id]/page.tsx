'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { adminApi } from '@/lib/api';
import Link from 'next/link';

type RecruiterOption = {
  id: string;
  name: string;
  email: string;
  companyName?: string | null;
};

type CompanySummary = {
  _id: string;
  name?: string;
  ownerRecruiter?: { _id?: string; name?: string; email?: string } | null;
};

function toRecruiterOption(u: {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
}): RecruiterOption | null {
  const id = u._id ?? u.id;
  if (!id) return null;
  return {
    id: String(id),
    name: u.name || 'Unknown',
    email: u.email || '',
  };
}

export default function AdminRepairCompanyPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const companyId = (params?.id as string) || '';

  const [company, setCompany] = useState<CompanySummary | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [ownerSearch, setOwnerSearch] = useState('');
  const [ownerResults, setOwnerResults] = useState<RecruiterOption[]>([]);
  const [ownerDropdownOpen, setOwnerDropdownOpen] = useState(false);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<RecruiterOption | null>(null);

  const [recruiterSearch, setRecruiterSearch] = useState('');
  const [recruiterResults, setRecruiterResults] = useState<RecruiterOption[]>([]);
  const [recruiterDropdownOpen, setRecruiterDropdownOpen] = useState(false);
  const [recruiterSearching, setRecruiterSearching] = useState(false);
  const [assignedRecruiters, setAssignedRecruiters] = useState<RecruiterOption[]>([]);

  const ownerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recruiterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ownerContainerRef = useRef<HTMLDivElement>(null);
  const recruiterContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'admin') {
      router.push(`/${user.role === 'recruiter' ? 'recruiter' : 'job-seeker'}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role !== 'admin' || !companyId) return;

    (async () => {
      setFetching(true);
      setError('');
      try {
        const data = await adminApi.getCompanyRelationships(companyId);
        const loadedCompany = data.company as CompanySummary;
        setCompany(loadedCompany);

        const owner = toRecruiterOption(
          (loadedCompany.ownerRecruiter as { _id?: string; name?: string; email?: string }) || {}
        );
        if (owner) {
          setSelectedOwner(owner);
          setOwnerSearch(owner.name);
        }

        const recruiters = (data.recruiters || [])
          .map((u: { _id?: string; name?: string; email?: string }) => toRecruiterOption(u))
          .filter((r: RecruiterOption | null): r is RecruiterOption => r !== null);
        setAssignedRecruiters(recruiters);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load company relationships');
      } finally {
        setFetching(false);
      }
    })();
  }, [user?.role, companyId]);

  useEffect(() => {
    if (ownerSearch.trim().length < 2) {
      setOwnerResults([]);
      setOwnerDropdownOpen(false);
      return;
    }
    if (ownerTimeoutRef.current) clearTimeout(ownerTimeoutRef.current);
    ownerTimeoutRef.current = setTimeout(async () => {
      setOwnerSearching(true);
      try {
        const data = await adminApi.getUsers({ search: ownerSearch.trim(), role: 'recruiter' });
        const list = (data.users || []).map(
          (u: { id: string; name: string; email: string; companyName?: string | null }) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            companyName: u.companyName ?? null,
          })
        );
        setOwnerResults(list);
        setOwnerDropdownOpen(list.length > 0);
      } catch {
        setOwnerResults([]);
      } finally {
        setOwnerSearching(false);
      }
    }, 300);
    return () => {
      if (ownerTimeoutRef.current) clearTimeout(ownerTimeoutRef.current);
    };
  }, [ownerSearch]);

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
      if (ownerContainerRef.current && !ownerContainerRef.current.contains(e.target as Node)) {
        setOwnerDropdownOpen(false);
      }
      if (
        recruiterContainerRef.current &&
        !recruiterContainerRef.current.contains(e.target as Node)
      ) {
        setRecruiterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const addAssignedRecruiter = (recruiter: RecruiterOption) => {
    setAssignedRecruiters((prev) =>
      prev.some((r) => r.id === recruiter.id) ? prev : [...prev, recruiter]
    );
    setRecruiterSearch('');
    setRecruiterDropdownOpen(false);
  };

  const removeAssignedRecruiter = (id: string) => {
    setAssignedRecruiters((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const recruiterIds = [
      ...new Set([
        ...assignedRecruiters.map((r) => r.id),
        ...(selectedOwner ? [selectedOwner.id] : []),
      ]),
    ];

    setSubmitting(true);
    try {
      await adminApi.repairCompanyRelationships({
        companyId,
        ownerRecruiterId: selectedOwner?.id,
        recruiterIds,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push(`/companies/${companyId}`);
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Repair request failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || fetching) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <Link
            href={`/companies/${companyId}`}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to company
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Repair Company Relationships</h1>
          <p className="text-gray-600 text-sm mb-6">
            Set the company owner and which recruiters are linked to this company. Recruiters
            removed from the list will be unlinked from the company.
          </p>

          {company && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Company</p>
              <p className="text-gray-900 font-semibold">{company.name || '(No name)'}</p>
              <p className="text-xs text-gray-500 mt-1">
                Current owner: {selectedOwner?.name ?? '—'}
                {selectedOwner?.email ? ` (${selectedOwner.email})` : ''}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div ref={ownerContainerRef} className="relative">
              <label htmlFor="owner-search" className="block text-sm font-medium text-gray-700 mb-1">
                Owner recruiter
              </label>
              <input
                id="owner-search"
                type="text"
                value={ownerSearch}
                onChange={(e) => {
                  setOwnerSearch(e.target.value);
                  setSelectedOwner(null);
                }}
                onFocus={() => ownerResults.length > 0 && setOwnerDropdownOpen(true)}
                placeholder="Search by name or email..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              {ownerSearching && (
                <p className="absolute right-3 top-9 text-xs text-gray-500">Searching...</p>
              )}
              {ownerDropdownOpen && ownerResults.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {ownerResults.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOwner(r);
                          setOwnerSearch(r.name);
                          setOwnerDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 text-gray-900"
                      >
                        <span className="font-medium">{r.name}</span>
                        {r.email && <span className="text-gray-500 text-sm ml-2">{r.email}</span>}
                        {r.companyName && (
                          <span className="block text-xs text-gray-400">{r.companyName}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selectedOwner && (
                <div className="mt-2 flex items-center gap-2">
                    <p className="text-sm text-green-700">
                      Selected: {selectedOwner.name} ({selectedOwner.email})
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOwner(null);
                        setOwnerSearch('');
                      }}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Clear owner
                    </button>
                </div>
              )}
            </div>

            <div ref={recruiterContainerRef} className="relative">
              <label
                htmlFor="recruiter-search"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Assigned recruiters
              </label>
              <input
                id="recruiter-search"
                type="text"
                value={recruiterSearch}
                onChange={(e) => setRecruiterSearch(e.target.value)}
                onFocus={() => recruiterResults.length > 0 && setRecruiterDropdownOpen(true)}
                placeholder="Search to add a recruiter..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                        onClick={() => addAssignedRecruiter(r)}
                        className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 text-gray-900"
                      >
                        <span className="font-medium">{r.name}</span>
                        {r.email && <span className="text-gray-500 text-sm ml-2">{r.email}</span>}
                        {r.companyName && (
                          <span className="block text-xs text-gray-400">{r.companyName}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {assignedRecruiters.length > 0 ? (
              <ul className="space-y-2">
                {assignedRecruiters.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm"
                  >
                    <span className="text-gray-900">
                      {r.name}
                      {r.email && <span className="text-gray-500 ml-2">{r.email}</span>}
                      {selectedOwner?.id === r.id && (
                        <span className="ml-2 text-xs text-blue-700 font-medium">(owner)</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAssignedRecruiter(r.id)}
                      className="text-red-600 hover:text-red-800 text-xs font-medium"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No recruiters assigned yet.</p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting || success}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {submitting ? 'Saving...' : success ? 'Saved' : 'Repair company relationships'}
              </button>
              <Link
                href={`/companies/${companyId}`}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
              >
                Cancel
              </Link>
            </div>
          </form>

          {success && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
              Company relationships updated successfully. Redirecting to company page...
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

