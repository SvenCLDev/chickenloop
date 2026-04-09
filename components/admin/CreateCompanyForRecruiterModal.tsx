'use client';

import { useEffect, useState } from 'react';
import { COUNTRY_OPTIONS } from '@/lib/countryUtils';

export type CreateCompanyRecruiterTarget = {
  id: string;
  name: string;
  email: string;
  companyName?: string | null;
};

type Props = {
  isOpen: boolean;
  recruiter: CreateCompanyRecruiterTarget | null;
  onClose: () => void;
  onSuccess?: (result: { companyName: string; companyId?: string }) => void;
};

export default function CreateCompanyForRecruiterModal({
  isOpen,
  recruiter,
  onClose,
  onSuccess,
}: Props) {
  const [createCompanyForm, setCreateCompanyForm] = useState({
    name: '',
    description: '',
    city: '',
    country: '',
  });
  const [createCompanyError, setCreateCompanyError] = useState('');
  const [creatingCompany, setCreatingCompany] = useState(false);

  useEffect(() => {
    if (!isOpen || !recruiter) return;
    setCreateCompanyError('');
    setCreateCompanyForm({
      name: (recruiter.companyName && recruiter.companyName.trim()) || '',
      description: '',
      city: '',
      country: '',
    });
  }, [isOpen, recruiter]);

  if (!isOpen || !recruiter) {
    return null;
  }

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateCompanyError('');

    if (!createCompanyForm.name.trim()) {
      setCreateCompanyError('Company Name is required.');
      return;
    }

    if (!createCompanyForm.country.trim()) {
      setCreateCompanyError('Country is required.');
      return;
    }

    setCreatingCompany(true);
    try {
      const response = await fetch('/api/admin/create-company-for-recruiter', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recruiterId: recruiter.id,
          name: createCompanyForm.name.trim(),
          description: createCompanyForm.description.trim(),
          city: createCompanyForm.city.trim(),
          country: createCompanyForm.country.trim().toUpperCase(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to create company');
      }

      const companyName = data?.company?.name || createCompanyForm.name.trim();
      const rawId = data?.company?._id ?? data?.company?.id;
      const companyId =
        rawId !== undefined && rawId !== null ? String(rawId) : undefined;
      onSuccess?.({ companyName, companyId });
      onClose();
    } catch (err: unknown) {
      setCreateCompanyError(err instanceof Error ? err.message : 'Failed to create company');
    } finally {
      setCreatingCompany(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Create Company</h2>
        <p className="text-sm text-gray-600 mb-4">
          Create and link a company for <span className="font-medium">{recruiter.name}</span>.
        </p>
        {createCompanyError && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded mb-4">
            {createCompanyError}
          </div>
        )}
        <form onSubmit={handleCreateCompany} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={createCompanyForm.name}
              onChange={(e) => setCreateCompanyForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={createCompanyForm.description}
              onChange={(e) => setCreateCompanyForm((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 min-h-24"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              value={createCompanyForm.city}
              onChange={(e) => setCreateCompanyForm((prev) => ({ ...prev, city: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country (ISO-2) <span className="text-red-500">*</span>
            </label>
            <select
              value={createCompanyForm.country}
              onChange={(e) => setCreateCompanyForm((prev) => ({ ...prev, country: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
              required
            >
              <option value="">Select country</option>
              {COUNTRY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name} ({option.code})
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={creatingCompany}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {creatingCompany ? 'Creating…' : 'Create Company'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
