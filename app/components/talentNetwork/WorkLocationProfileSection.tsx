'use client';

import { useMemo, useState } from 'react';
import { getCountryNameFromCode } from '@/lib/countryUtils';
import { WORK_AUTHORIZATION_STATUS_LABELS } from '@/lib/talentNetwork/constants';
import type { WorkAuthorization, WorkAuthorizationStatus } from '@/lib/talentNetwork/types';
import { EU_EEA_CH_COUNTRY_CODES } from '@/lib/workLocation';

export interface WorkLocationProfileData {
  nationalityCountry?: string;
  preferredWorkCountries?: string[];
  workEligibleCountries?: string[];
  euEeaWorkRights?: boolean;
  workAuthorizations?: WorkAuthorization[];
}

const EU_EEA_CH_SET = new Set<string>(EU_EEA_CH_COUNTRY_CODES);

function formatCountryCodes(codes: string[] | undefined): string {
  if (!codes?.length) return '';
  return codes.map((code) => getCountryNameFromCode(code)).join(', ');
}

export default function WorkLocationProfileSection({
  data,
}: {
  data: WorkLocationProfileData;
}) {
  const [showEligibleCountries, setShowEligibleCountries] = useState(false);

  const hasEuEeaRights = data.euEeaWorkRights === true;
  const eligibleCodes = data.workEligibleCountries ?? [];
  const extraEligibleCodes = useMemo(
    () => eligibleCodes.filter((code) => !EU_EEA_CH_SET.has(code.toUpperCase())),
    [eligibleCodes]
  );

  const hasBasic =
    data.nationalityCountry ||
    (data.preferredWorkCountries?.length ?? 0) > 0 ||
    eligibleCodes.length > 0 ||
    hasEuEeaRights;
  const hasAuthorizations = (data.workAuthorizations?.length ?? 0) > 0;

  if (!hasBasic && !hasAuthorizations) {
    return null;
  }

  return (
    <div className="mb-6 pb-6 border-b border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Locations &amp; work rights</h2>
      <dl className="space-y-3 text-sm">
        {data.nationalityCountry && (
          <div>
            <dt className="font-medium text-gray-700">Nationality</dt>
            <dd className="text-gray-900">{getCountryNameFromCode(data.nationalityCountry)}</dd>
          </div>
        )}
        {(data.preferredWorkCountries?.length ?? 0) > 0 && (
          <div>
            <dt className="font-medium text-gray-700">Open to work in</dt>
            <dd className="text-gray-900">{formatCountryCodes(data.preferredWorkCountries)}</dd>
          </div>
        )}

        {hasEuEeaRights && (
          <div>
            <dt className="font-medium text-gray-700">Work rights</dt>
            <dd className="text-gray-900">
              <span className="inline-flex items-center rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-900">
                Can work anywhere in the EU / EEA / Switzerland
              </span>
            </dd>
          </div>
        )}

        {hasEuEeaRights ? (
          <>
            {extraEligibleCodes.length > 0 && (
              <div>
                <dt className="font-medium text-gray-700">Also can work in</dt>
                <dd className="text-gray-900">{formatCountryCodes(extraEligibleCodes)}</dd>
              </div>
            )}
            {eligibleCodes.length > 0 && (
              <div>
                <dt className="sr-only">Eligible countries</dt>
                <dd>
                  <button
                    type="button"
                    onClick={() => setShowEligibleCountries((v) => !v)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {showEligibleCountries ? 'Hide eligible countries' : 'Show eligible countries'}
                  </button>
                  {showEligibleCountries && (
                    <p className="mt-2 text-gray-900">{formatCountryCodes(eligibleCodes)}</p>
                  )}
                </dd>
              </div>
            )}
          </>
        ) : (
          eligibleCodes.length > 0 && (
            <div>
              <dt className="font-medium text-gray-700">Can work in</dt>
              <dd className="text-gray-900">{formatCountryCodes(eligibleCodes)}</dd>
            </div>
          )
        )}
      </dl>

      {hasAuthorizations && (
        <div className="mt-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">Visa / permit details</h3>
          {data.workAuthorizations!.map((entry, index) => (
            <div key={`${entry.country}-${index}`} className="bg-gray-50 p-3 rounded-lg text-sm">
              <p className="font-medium text-gray-900">
                {getCountryNameFromCode(entry.country)}
                {' · '}
                {WORK_AUTHORIZATION_STATUS_LABELS[entry.status as WorkAuthorizationStatus] ??
                  entry.status}
              </p>
              {entry.permitType && (
                <p className="text-gray-600 mt-1">Permit: {entry.permitType}</p>
              )}
              {entry.validUntil && (
                <p className="text-gray-600 mt-1">
                  Valid until: {String(entry.validUntil).slice(0, 10)}
                </p>
              )}
              {entry.notes && <p className="text-gray-600 mt-1">{entry.notes}</p>}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500 mt-3">
        Self-reported work eligibility. Employers must verify before hiring.
      </p>
    </div>
  );
}
