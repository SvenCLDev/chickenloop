'use client';

import { useRouter } from 'next/navigation';
import { buildJobSearchUrl, type JobSearchParams } from '@/lib/jobSearchParams';

interface SearchBarProps {
  keyword: string;
  location: string;
  category: string;
  categories: string[];
  categoriesLoading: boolean;
  onKeywordChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}

export default function SearchBar({
  keyword,
  location,
  category,
  categories,
  categoriesLoading,
  onKeywordChange,
  onLocationChange,
  onCategoryChange,
}: SearchBarProps) {
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build query parameters using canonical utility - only include non-empty values
    const params: JobSearchParams = {};
    if (keyword.trim()) params.keyword = keyword.trim();
    if (location.trim()) params.location = location.trim(); // Semantic location search
    if (category.trim()) params.category = category.trim();
    
    // Build URL with query string using canonical utility
    // This ensures consistent parameter handling across the app
    const jobsUrl = buildJobSearchUrl('/jobs', params);
    
    // Redirect to /jobs with query parameters
    router.push(jobsUrl);
  };

  return (
    <section className="bg-white py-12 sm:py-16 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gray-50 rounded-xl p-6 sm:p-8 shadow-sm border border-gray-100">
          <form 
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-4"
          >
            {/* Keyword Input */}
            <div className="flex-1">
              <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-1">
                Keyword
              </label>
              <input
                type="text"
                id="keyword"
                value={keyword}
                onChange={(e) => onKeywordChange(e.target.value)}
                placeholder="Search jobs..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 shadow-sm transition-shadow"
              />
            </div>

            {/* Location Input */}
            <div className="flex-1">
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => onLocationChange(e.target.value)}
                placeholder="City or country"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 shadow-sm transition-shadow"
              />
            </div>

            {/* Category Dropdown */}
            <div className="flex-1">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 shadow-sm transition-shadow"
                disabled={categoriesLoading}
              >
                <option value="">All Categories</option>
                {categoriesLoading ? (
                  <option disabled>Loading categories...</option>
                ) : (
                  categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Search Button */}
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium text-center shadow-md hover:shadow-lg transform hover:scale-105"
              >
                Search Jobs
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}





