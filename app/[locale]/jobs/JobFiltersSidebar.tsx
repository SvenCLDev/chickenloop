'use client';

import type { JobListFilters } from '@/lib/jobs';

interface JobFiltersSidebarProps {
  filters: JobListFilters;
  onChange: (key: keyof JobListFilters, value: string) => void;
  countries: Array<{ code: string; name: string }>;
  cities: string[];
  categories: Array<{ value: string; label: string }>;
  employmentTypes: Array<{ value: string; label: string }>;
  activities: string[];
  languages: string[];
}

export default function JobFiltersSidebar({
  filters,
  onChange,
  countries,
  cities,
  categories,
  employmentTypes,
  activities,
  languages,
}: JobFiltersSidebarProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Country</label>
            {filters.country && (
              <button
                type="button"
                onClick={() => onChange('country', '')}
                className="text-gray-400 hover:text-gray-700 text-sm"
                aria-label="Clear country filter"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={filters.country || ''}
            onChange={(e) => onChange('country', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
          >
            <option value="">All Countries</option>
            {countries.map((country) => (
              <option key={country.code} value={country.name}>
                {country.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">City</label>
            {filters.city && (
              <button
                type="button"
                onClick={() => onChange('city', '')}
                className="text-gray-400 hover:text-gray-700 text-sm"
                aria-label="Clear city filter"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={filters.city || ''}
            onChange={(e) => onChange('city', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
          >
            <option value="">All Cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Job Category</label>
            {filters.category && (
              <button
                type="button"
                onClick={() => onChange('category', '')}
                className="text-gray-400 hover:text-gray-700 text-sm"
                aria-label="Clear category filter"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={filters.category || ''}
            onChange={(e) => onChange('category', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Employment Type</label>
            {filters.employmentType && (
              <button
                type="button"
                onClick={() => onChange('employmentType', '')}
                className="text-gray-400 hover:text-gray-700 text-sm"
                aria-label="Clear employment type filter"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={filters.employmentType || ''}
            onChange={(e) => onChange('employmentType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
          >
            <option value="">All Employment Types</option>
            {employmentTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Activity Type</label>
            {filters.activity && (
              <button
                type="button"
                onClick={() => onChange('activity', '')}
                className="text-gray-400 hover:text-gray-700 text-sm"
                aria-label="Clear activity filter"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={filters.activity || ''}
            onChange={(e) => onChange('activity', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
          >
            <option value="">All Activities</option>
            {activities.map((activity) => (
              <option key={activity} value={activity}>
                {activity}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Language</label>
            {filters.language && (
              <button
                type="button"
                onClick={() => onChange('language', '')}
                className="text-gray-400 hover:text-gray-700 text-sm"
                aria-label="Clear language filter"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={filters.language || ''}
            onChange={(e) => onChange('language', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
          >
            <option value="">All Languages</option>
            {languages.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
