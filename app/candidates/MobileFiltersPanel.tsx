'use client';

import CandidateFiltersSidebar from './CandidateFiltersSidebar';
import type { CandidateListFilters } from '@/lib/candidateSearchParams';

type MobileFiltersPanelProps = {
  open: boolean;
  onClose: () => void;
  filters: CandidateListFilters;
  onChange: (key: keyof CandidateListFilters, value: string | boolean) => void;
  workAreas: string[];
  languages: string[];
  experienceLevels: string[];
  availabilityOptions: string[];
  eligibleCountries: Array<{ code: string; name: string }>;
  preferredCountries: Array<{ code: string; name: string }>;
};

export default function MobileFiltersPanel({
  open,
  onClose,
  filters,
  onChange,
  workAreas,
  languages,
  experienceLevels,
  availabilityOptions,
  eligibleCountries,
  preferredCountries,
}: MobileFiltersPanelProps) {
  if (!open) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-y-0 left-0 w-80 max-w-[90vw] bg-white overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">More Filters</h3>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 text-gray-600 hover:text-gray-900"
          >
            Close
          </button>
        </div>
        <CandidateFiltersSidebar
          filters={filters}
          onChange={onChange}
          workAreas={workAreas}
          languages={languages}
          experienceLevels={experienceLevels}
          availabilityOptions={availabilityOptions}
          eligibleCountries={eligibleCountries}
          preferredCountries={preferredCountries}
        />
      </div>
    </div>
  );
}
