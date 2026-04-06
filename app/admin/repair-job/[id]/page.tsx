'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { adminApi } from '@/lib/api';
import Link from 'next/link';

type CompanyOption = { id: string; name: string };
type RecruiterOption = { id: string; name: string; email: string; companyName?: string | null };

export default function AdminRepairJobPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const jobId = (params?.id as string) || '';

  const [job, setJob] = useState<{ _id: string; title?: string; companyId?: { name?: string }; recruiter?: { name?: string; email?: string } } | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [createNewCompany, setCreateNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [companyResults, setCompanyResults] = useState<CompanyOption[]>([]);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [companySearching, setCompanySearching] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyOption | null>(null);

  const [recruiterSearch, setRecruiterSearch] = useState('');
  const [recruiterResults, setRecruiterResults] = useState<RecruiterOption[]>([]);
  const [recruiterDropdownOpen, setRecruiterDropdownOpen] = useState(false);
  const [recruiterSearching, setRecruiterSearching] = useState(false);
  const [selectedRecruiter, setSelectedRecruiter] = useState<RecruiterOption | null>(null);

  const companyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recruiterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const companyContainerRef = useRef<HTMLDivElement>(null);
  const recruiterContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'admin') {
      router.push(`/${user.role === 'recruiter' ? 'recruiter' : 'job-seeker'}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'admin' && jobId) {
      (async () => {
        setFetching(true);
        setError('');
        try {
          const data = await adminApi.getJob(jobId);
          setJob(data.job);
          const company = data.job?.companyId as { _id?: string; name?: string } | undefined;
          const recruiter = data.job?.recruiter as { _id?: string; name?: string; email?: string } | undefined;
          if (company?._id) {
            setSelectedCompany({ id: String(company._id), name: company.name || 'Unknown' });
            setCompanySearch(company.name || '');
          }
          if (recruiter?._id) {
            setSelectedRecruiter({
              id: String(recruiter._id),
              name: recruiter.name || 'Unknown',
              email: recruiter.email || '',
            });
            setRecruiterSearch(recruiter.name || recruiter.email || '');
          }
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Failed to load job');
        } finally {
          setFetching(false);
        }
      })();
    }
  }, [user?.role, jobId]);

  useEffect(() => {
    if (companySearch.trim().length < 2) {
      setCompanyResults([]);
      setCompanyDropdownOpen(false);
      return;
    }
    if (companyTimeoutRef.current) clearTimeout(companyTimeoutRef.current);
    companyTimeoutRef.current = setTimeout(async () => {
      setCompanySearching(true);
      try {
        const data = await adminApi.getCompanies({ search: companySearch.trim() });
        const list = (data.companies || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }));
        setCompanyResults(list);
        setCompanyDropdownOpen(list.length > 0);
      } catch {
        setCompanyResults([]);
      } finally {
        setCompanySearching(false);
      }
    }, 300);
    return () => {
      if (companyTimeoutRef.current) clearTimeout(companyTimeoutRef.current);
    };
  }, [companySearch]);

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
        const list = (data.users || []).map((u: { id: string; name: string; email: string; companyName?: string | null }) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          companyName: u.companyName ?? null,
        }));
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
      if (companyContainerRef.current && !companyContainerRef.current.contains(e.target as Node)) setCompanyDropdownOpen(false);
      if (recruiterContainerRef.current && !recruiterContainerRef.current.contains(e.target as Node)) setRecruiterDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (createNewCompany) {
      if (!newCompanyName.trim() || !selectedRecruiter) {
        setError('Please enter a new company name and select the recruiter.');
        return;
      }
    } else {
      if (!selectedCompany || !selectedRecruiter) {
        setError('Please select both a company and a recruiter.');
        return;
      }
    }
    setSubmitting(true);
    try {
      await adminApi.repairJobRelationships({
        jobId,
        recruiterId: selectedRecruiter!.id,
        ...(createNewCompany
          ? { createCompany: { name: newCompanyName.trim() } }
          : { companyId: selectedCompany!.id }),
      });
      setSuccess(true);
      setTimeout(() => {
        router.push(`/admin/jobs/${jobId}/edit`);
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
          <Link href="/admin" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Repair Job Relationships</h1>
          <p className="text-gray-600 text-sm mb-6">
            Reattach this job to the correct company and recruiter. You can pick an existing company or create a new one (e.g. when the correct company was never created). The recruiter will be set as owner of the company.
          </p>

          {job && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Job</p>
              <p className="text-gray-900 font-semibold">{job.title || '(No title)'}</p>
              <p className="text-xs text-gray-500 mt-1">
                Current company: {(job.companyId as { name?: string })?.name ?? '—'} · Recruiter: {(job.recruiter as { name?: string })?.name ?? '—'}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center gap-2 mb-4">
              <input
                id="create-new-company"
                type="checkbox"
                checked={createNewCompany}
                onChange={(e) => {
                  setCreateNewCompany(e.target.checked);
                  if (e.target.checked) {
                    setSelectedCompany(null);
                    setCompanySearch('');
                  } else {
                    setNewCompanyName('');
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="create-new-company" className="text-sm font-medium text-gray-700">
                Create new company (correct company doesn&apos;t exist yet)
              </label>
            </div>

            {createNewCompany ? (
              <div>
                <label htmlFor="new-company-name" className="block text-sm font-medium text-gray-700 mb-1">
                  New company name *
                </label>
                <input
                  id="new-company-name"
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Enter company name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
            ) : (
              <div ref={companyContainerRef} className="relative">
                <label htmlFor="company-search" className="block text-sm font-medium text-gray-700 mb-1">
                  Company *
                </label>
                <input
                  id="company-search"
                  type="text"
                  value={companySearch}
                  onChange={(e) => {
                    setCompanySearch(e.target.value);
                    setSelectedCompany(null);
                  }}
                  onFocus={() => companyResults.length > 0 && setCompanyDropdownOpen(true)}
                  placeholder="Search by company name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                {companySearching && (
                  <p className="absolute right-3 top-9 text-xs text-gray-500">Searching...</p>
                )}
                {companyDropdownOpen && companyResults.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {companyResults.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCompany(c);
                            setCompanySearch(c.name);
                            setCompanyDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 text-gray-900"
                        >
                          {c.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {selectedCompany && (
                  <p className="mt-1 text-sm text-green-700">Selected: {selectedCompany.name}</p>
                )}
              </div>
            )}

            <div ref={recruiterContainerRef} className="relative">
              <label htmlFor="recruiter-search" className="block text-sm font-medium text-gray-700 mb-1">
                Recruiter *
              </label>
              <input
                id="recruiter-search"
                type="text"
                value={recruiterSearch}
                onChange={(e) => {
                  setRecruiterSearch(e.target.value);
                  setSelectedRecruiter(null);
                }}
                onFocus={() => recruiterResults.length > 0 && setRecruiterDropdownOpen(true)}
                placeholder="Search by name or email..."
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
                        onClick={() => {
                          setSelectedRecruiter(r);
                          setRecruiterSearch(r.name);
                          setRecruiterDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 text-gray-900"
                      >
                        <span className="font-medium">{r.name}</span>
                        {r.email && <span className="text-gray-500 text-sm ml-2">{r.email}</span>}
                        {r.companyName && <span className="block text-xs text-gray-400">{r.companyName}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selectedRecruiter && (
                <p className="mt-1 text-sm text-green-700">Selected: {selectedRecruiter.name} ({selectedRecruiter.email})</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={
                  submitting ||
                  !selectedRecruiter ||
                  (createNewCompany ? !newCompanyName.trim() : !selectedCompany) ||
                  success
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {submitting ? 'Saving...' : success ? 'Saved' : 'Repair job relationships'}
              </button>
              <Link
                href={`/admin/jobs/${jobId}/edit`}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
              >
                Cancel
              </Link>
            </div>
          </form>

          {success && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
              Job relationships updated successfully. Redirecting to job edit page...
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
