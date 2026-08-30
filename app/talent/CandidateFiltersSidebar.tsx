'use client';

import FilterCollapsibleSection from '@/app/components/FilterCollapsibleSection';
import type { CandidateListFilters } from '@/lib/candidateSearchParams';

type FilterSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  emptyLabel: string;
};

function FilterSelect({ label, value, onChange, options, emptyLabel }: FilterSelectProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-gray-400 hover:text-gray-700 text-sm"
            aria-label={`Clear ${label.toLowerCase()} filter`}
          >
            ✕
          </button>
        )}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

type CandidateFiltersSidebarProps = {
  filters: CandidateListFilters;
  onChange: (key: keyof CandidateListFilters, value: string | boolean) => void;
  workAreas: string[];
  languages: string[];
  experienceLevels: string[];
  availabilityOptions: string[];
  eligibleCountries: Array<{ code: string; name: string }>;
  preferredCountries: Array<{ code: string; name: string }>;
};

const EXPERIENCE_LEVEL_LABELS: Record<string, string> = {
  entry: 'Entry',
  intermediate: 'Intermediate',
  experienced: 'Experienced',
  senior: 'Senior',
};

export default function CandidateFiltersSidebar({
  filters,
  onChange,
  workAreas,
  languages,
  experienceLevels,
  eligibleCountries,
  preferredCountries,
}: CandidateFiltersSidebarProps) {
  const languageLocationActiveCount =
    (filters.language ? 1 : 0) + (filters.location.trim() ? 1 : 0);
  const eligibilityActiveCount =
    (filters.canWorkIn ? 1 : 0) +
    (filters.preferredCountry ? 1 : 0) +
    (filters.noSponsorshipIn ? 1 : 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Filters</h2>
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Profile</p>
          <div className="space-y-3">
            <FilterSelect
              label="Work area / role"
              value={filters.workArea}
              onChange={(value) => onChange('workArea', value)}
              options={workAreas.map((area) => ({ value: area, label: area }))}
              emptyLabel="All work areas"
            />
            <FilterSelect
              label="Experience level"
              value={filters.experienceLevel}
              onChange={(value) => onChange('experienceLevel', value)}
              options={experienceLevels.map((level) => ({
                value: level,
                label: EXPERIENCE_LEVEL_LABELS[level] || level,
              }))}
              emptyLabel="All experience levels"
            />
          </div>
        </div>

        <FilterCollapsibleSection
          title="Languages & location"
          activeCount={languageLocationActiveCount}
        >
          <FilterSelect
            label="Language"
            value={filters.language}
            onChange={(value) => onChange('language', value)}
            options={languages.map((language) => ({ value: language, label: language }))}
            emptyLabel="All languages"
          />
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="candidate-location-filter" className="block text-sm font-medium text-gray-700">
                Location
              </label>
              {filters.location && (
                <button
                  type="button"
                  onClick={() => onChange('location', '')}
                  className="text-gray-400 hover:text-gray-700 text-sm"
                  aria-label="Clear location filter"
                >
                  ✕
                </button>
              )}
            </div>
            <input
              id="candidate-location-filter"
              type="text"
              defaultValue={filters.location}
              key={filters.location}
              onBlur={(e) => onChange('location', e.target.value)}
              placeholder="City or country"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
            />
          </div>
        </FilterCollapsibleSection>

        <FilterCollapsibleSection title="Work eligibility" activeCount={eligibilityActiveCount}>
          <FilterSelect
            label="Can work in"
            value={filters.canWorkIn}
            onChange={(value) => onChange('canWorkIn', value)}
            options={eligibleCountries.map((country) => ({
              value: country.code,
              label: country.name,
            }))}
            emptyLabel="Any country"
          />
          <FilterSelect
            label="Open to working in"
            value={filters.preferredCountry}
            onChange={(value) => onChange('preferredCountry', value)}
            options={preferredCountries.map((country) => ({
              value: country.code,
              label: country.name,
            }))}
            emptyLabel="Any country"
          />
          <FilterSelect
            label="No sponsorship needed in"
            value={filters.noSponsorshipIn}
            onChange={(value) => onChange('noSponsorshipIn', value)}
            options={eligibleCountries.map((country) => ({
              value: country.code,
              label: country.name,
            }))}
            emptyLabel="Any country"
          />
        </FilterCollapsibleSection>
      </div>
    </div>
  );
}
