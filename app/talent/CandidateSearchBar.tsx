'use client';

import type { CandidateListFilters } from '@/lib/candidateSearchParams';

type CandidateSearchBarProps = {
  searchKeyword: string;
  filters: CandidateListFilters;
  sports: string[];
  certifications: string[];
  availabilityOptions: string[];
  onSearchKeywordChange: (value: string) => void;
  onQuickFilterChange: (key: keyof CandidateListFilters, value: string) => void;
  onSortChange: (value: string) => void;
  onVerifiedOnlyChange: (checked: boolean) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onOpenMoreFilters: () => void;
};

const AVAILABILITY_LABELS: Record<string, string> = {
  available_now: 'Available now',
  available_soon: 'Available soon',
  seasonal: 'Seasonal',
  not_available: 'Not available',
};

export default function CandidateSearchBar({
  searchKeyword,
  filters,
  sports,
  certifications,
  availabilityOptions,
  onSearchKeywordChange,
  onQuickFilterChange,
  onSortChange,
  onVerifiedOnlyChange,
  onSearchSubmit,
  onOpenMoreFilters,
}: CandidateSearchBarProps) {
  return (
    <form
      onSubmit={onSearchSubmit}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 space-y-3"
    >
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="flex-[2]">
          <label htmlFor="candidate-kw-search" className="sr-only">
            Search by name, skill, or certification
          </label>
          <input
            id="candidate-kw-search"
            type="search"
            value={searchKeyword}
            onChange={(e) => onSearchKeywordChange(e.target.value)}
            placeholder="Search by name, skill, or certification"
            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>
        <button
          type="submit"
          className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
        >
          Search
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-center">
        <select
          aria-label="Sport or discipline"
          value={filters.sport}
          onChange={(e) => onQuickFilterChange('sport', e.target.value)}
          className="flex-1 min-w-[140px] px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
        >
          <option value="">All sports / disciplines</option>
          {sports.map((sport) => (
            <option key={sport} value={sport}>
              {sport}
            </option>
          ))}
        </select>

        <select
          aria-label="Certification"
          value={filters.certification}
          onChange={(e) => onQuickFilterChange('certification', e.target.value)}
          className="flex-1 min-w-[140px] px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
        >
          <option value="">All certifications</option>
          {certifications.map((cert) => (
            <option key={cert} value={cert}>
              {cert}
            </option>
          ))}
        </select>

        <select
          aria-label="Availability"
          value={filters.availability}
          onChange={(e) => onQuickFilterChange('availability', e.target.value)}
          className="flex-1 min-w-[140px] px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
        >
          <option value="">Any availability</option>
          {availabilityOptions.map((option) => (
            <option key={option} value={option}>
              {AVAILABILITY_LABELS[option] || option}
            </option>
          ))}
        </select>

        <select
          aria-label="Sort order"
          value={filters.sort || 'newest'}
          onChange={(e) => onSortChange(e.target.value)}
          className="flex-1 min-w-[140px] px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
        >
          <option value="newest">Recently updated</option>
          <option value="oldest">Oldest profiles first</option>
        </select>

        <button
          type="button"
          onClick={() => onVerifiedOnlyChange(!filters.verifiedOnly)}
          aria-pressed={filters.verifiedOnly}
          className={`px-3 py-2 rounded-md text-sm font-medium border whitespace-nowrap transition-colors ${
            filters.verifiedOnly
              ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Verified only
        </button>

        <button
          type="button"
          onClick={onOpenMoreFilters}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 lg:hidden"
        >
          More filters
        </button>
      </div>
    </form>
  );
}
