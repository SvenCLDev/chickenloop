'use client';

import JobFiltersSidebar from './JobFiltersSidebar';
import type { JobListFilters } from '@/lib/jobs';

interface MobileFiltersPanelProps {
  open: boolean;
  onClose: () => void;
  filters: JobListFilters;
  onChange: (key: keyof JobListFilters, value: string) => void;
  countries: Array<{ code: string; name: string }>;
  cities: string[];
  categories: Array<{ value: string; label: string }>;
  employmentTypes: Array<{ value: string; label: string }>;
  activities: string[];
  languages: string[];
}

export default function MobileFiltersPanel({
  open,
  onClose,
  filters,
  onChange,
  countries,
  cities,
  categories,
  employmentTypes,
  activities,
  languages,
}: MobileFiltersPanelProps) {
  if (!open) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
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
        <JobFiltersSidebar
          filters={filters}
          onChange={onChange}
          countries={countries}
          cities={cities}
          categories={categories}
          employmentTypes={employmentTypes}
          activities={activities}
          languages={languages}
        />
      </div>
    </div>
  );
}
