'use client';

interface JobSearchBarProps {
  keyword: string;
  location: string;
  onKeywordChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function JobSearchBar({
  keyword,
  location,
  onKeywordChange,
  onLocationChange,
  onSubmit,
}: JobSearchBarProps) {
  return (
    <form onSubmit={onSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="Keyword"
            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>
        <div className="flex-1">
          <input
            type="text"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="City or country"
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
    </form>
  );
}
