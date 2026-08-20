'use client';

import { useState } from 'react';
import { COUNTRY_OPTIONS } from '@/lib/countryUtils';
import { WORK_AUTHORIZATION_STATUS_OPTIONS } from '@/lib/talentNetwork/constants';
import {
  emptyWorkAuthorization,
  type TalentNetworkFormState,
  type WorkAuthorizationFormEntry,
} from './formTypes';

interface WorkLocationBlockProps {
  formData: TalentNetworkFormState;
  onChange: (updates: Partial<TalentNetworkFormState>) => void;
}

function CountryPills({
  codes,
  onRemove,
}: {
  codes: string[];
  onRemove: (code: string) => void;
}) {
  if (codes.length === 0) {
    return <p className="text-sm text-gray-500">None selected yet.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {codes.map((code) => {
        const name = COUNTRY_OPTIONS.find((c) => c.code === code)?.name ?? code;
        return (
          <span
            key={code}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-teal-100 text-teal-900 border border-teal-200"
          >
            {name}
            <button
              type="button"
              onClick={() => onRemove(code)}
              className="text-teal-700 hover:text-teal-900 font-bold leading-none"
              aria-label={`Remove ${name}`}
            >
              ×
            </button>
          </span>
        );
      })}
    </div>
  );
}

function CountryAddSelect({
  id,
  label,
  excludeCodes,
  onAdd,
}: {
  id: string;
  label: string;
  excludeCodes: string[];
  onAdd: (code: string) => void;
}) {
  const [selected, setSelected] = useState('');
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
      <div className="flex-1">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <select
          id={id}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
        >
          <option value="">Select a country…</option>
          {COUNTRY_OPTIONS.filter((c) => !excludeCodes.includes(c.code)).map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        disabled={!selected}
        onClick={() => {
          if (selected) {
            onAdd(selected);
            setSelected('');
          }
        }}
        className="px-4 py-2 rounded-md text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Add
      </button>
    </div>
  );
}

export default function WorkLocationBlock({ formData, onChange }: WorkLocationBlockProps) {
  const [showAuthorizationDetails, setShowAuthorizationDetails] = useState(
    formData.workAuthorizations.length > 0
  );

  const addCountry = (
    field: 'preferredWorkCountries' | 'workEligibleCountries',
    code: string
  ) => {
    const current = formData[field];
    if (current.includes(code)) return;
    onChange({ [field]: [...current, code].sort() });
  };

  const removeCountry = (
    field: 'preferredWorkCountries' | 'workEligibleCountries',
    code: string
  ) => {
    onChange({ [field]: formData[field].filter((c) => c !== code) });
  };

  const updateAuthorization = (
    index: number,
    updates: Partial<WorkAuthorizationFormEntry>
  ) => {
    const next = [...formData.workAuthorizations];
    next[index] = { ...next[index], ...updates };
    onChange({ workAuthorizations: next });
  };

  const addAuthorization = () => {
    onChange({
      workAuthorizations: [...formData.workAuthorizations, emptyWorkAuthorization()],
    });
    setShowAuthorizationDetails(true);
  };

  const removeAuthorization = (index: number) => {
    onChange({
      workAuthorizations: formData.workAuthorizations.filter((_, i) => i !== index),
    });
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Locations &amp; work rights</h2>
        <p className="text-sm text-gray-600 mt-1">
          Self-reported information to help recruiters find candidates who can work in their country.
          Employers must verify eligibility before hiring.
        </p>
      </div>

      <div>
        <label htmlFor="nationalityCountry" className="block text-sm font-medium text-gray-700 mb-1">
          What passport do you hold?
        </label>
        <select
          id="nationalityCountry"
          value={formData.nationalityCountry}
          onChange={(e) => onChange({ nationalityCountry: e.target.value })}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
        >
          <option value="">Select nationality…</option>
          {COUNTRY_OPTIONS.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">
          Which countries would you like to work in?
        </p>
        <CountryPills
          codes={formData.preferredWorkCountries}
          onRemove={(code) => removeCountry('preferredWorkCountries', code)}
        />
        <CountryAddSelect
          id="add-preferred-country"
          label="Add preferred country"
          excludeCodes={formData.preferredWorkCountries}
          onAdd={(code) => addCountry('preferredWorkCountries', code)}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">
          Where can you already work without needing a new visa?
        </p>
        <p className="text-xs text-gray-500">
          Include countries where you are a citizen, permanent resident, or already hold a valid work
          permit.
        </p>
        <CountryPills
          codes={formData.workEligibleCountries}
          onRemove={(code) => removeCountry('workEligibleCountries', code)}
        />
        <CountryAddSelect
          id="add-eligible-country"
          label="Add country where you can work"
          excludeCodes={formData.workEligibleCountries}
          onAdd={(code) => addCountry('workEligibleCountries', code)}
        />
        <label className="flex items-start gap-2 mt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.euEeaWorkRights}
            onChange={(e) => onChange({ euEeaWorkRights: e.target.checked })}
            className="mt-1 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-gray-700">
            I can work anywhere in the EU / EEA / Switzerland
          </span>
        </label>
      </div>

      <div className="border border-gray-200 rounded-lg">
        <button
          type="button"
          onClick={() => setShowAuthorizationDetails((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-lg"
        >
          <span>Visa / permit details (optional)</span>
          <span className="text-gray-500">{showAuthorizationDetails ? '−' : '+'}</span>
        </button>
        {showAuthorizationDetails && (
          <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 pt-3">
              Add details for specific visas or permits if you want recruiters to see how you can work
              in each country.
            </p>
            {formData.workAuthorizations.map((entry, index) => (
              <div key={entry.clientId} className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-900">Permit {index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeAuthorization(index)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
                    <select
                      value={entry.country}
                      onChange={(e) => updateAuthorization(index, { country: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Select country…</option>
                      {COUNTRY_OPTIONS.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                    <select
                      value={entry.status}
                      onChange={(e) =>
                        updateAuthorization(index, {
                          status: e.target.value as WorkAuthorizationFormEntry['status'],
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Select status…</option>
                      {WORK_AUTHORIZATION_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Permit type (optional)
                    </label>
                    <input
                      type="text"
                      value={entry.permitType}
                      onChange={(e) => updateAuthorization(index, { permitType: e.target.value })}
                      placeholder="e.g. Working Holiday"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Valid until (optional)
                    </label>
                    <input
                      type="date"
                      value={entry.validUntil}
                      onChange={(e) => updateAuthorization(index, { validUntil: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Notes (optional)
                  </label>
                  <input
                    type="text"
                    value={entry.notes}
                    onChange={(e) => updateAuthorization(index, { notes: e.target.value })}
                    maxLength={200}
                    placeholder="Any extra detail for recruiters"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addAuthorization}
              className="text-sm text-teal-700 hover:text-teal-900 font-medium"
            >
              + Add visa / permit
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
