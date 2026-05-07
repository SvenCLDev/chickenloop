import Link from 'next/link';
import { getCountryNameFromCode } from '@/lib/countryUtils';
import { getJobUrl } from '@/lib/jobSlug';
import JobCardImage from '@/app/components/JobCardImage';

interface JobCardProps {
  job: {
    _id: string;
    title: string;
    company?: string;
    city: string;
    country?: string | null;
    pictures?: string[];
    featured?: boolean;
    lastRecruiterEditAt?: Date | string;
    createdAt?: Date | string;
  };
  /** Set true only for the first visible job card (LCP optimization). */
  priority?: boolean;
  /** Force featured styling (e.g. when used in Featured Jobs section). */
  featured?: boolean;
  /** If provided, show heart: job-seeker can toggle favourite; anonymous triggers onLoginPrompt. */
  user?: { role: string } | null;
  isFavourite?: boolean;
  togglingFavourite?: boolean;
  onHeartClick?: (e: React.MouseEvent, jobId: string) => void;
  onLoginPrompt?: () => void;
}

function formatUpdatedAgo(value?: Date | string): string | null {
  if (!value) return null;
  const updatedAt = new Date(value);
  if (Number.isNaN(updatedAt.getTime())) return null;

  const elapsedMs = Date.now() - updatedAt.getTime();
  if (elapsedMs < 0) return null;

  const dayMs = 24 * 60 * 60 * 1000;
  const dayCount = Math.floor(elapsedMs / dayMs);

  if (dayCount < 1) {
    return 'today';
  }
  if (dayCount < 30) {
    return `${dayCount} day${dayCount === 1 ? '' : 's'} ago`;
  }

  const monthCount = Math.floor(dayCount / 30);
  if (monthCount < 12) {
    return `${monthCount} month${monthCount === 1 ? '' : 's'} ago`;
  }

  const yearCount = Math.floor(dayCount / 365);
  return `${yearCount} year${yearCount === 1 ? '' : 's'} ago`;
}

export default function JobCard({
  job,
  priority = false,
  featured: featuredProp,
  user,
  isFavourite = false,
  togglingFavourite = false,
  onHeartClick,
  onLoginPrompt,
}: JobCardProps) {
  const isFeatured = featuredProp ?? job.featured ?? false;
  const thumbnail = job.pictures && job.pictures.length > 0 ? job.pictures[0] : null;
  const showHeart = user?.role === 'job-seeker' || !user;
  const isJobSeeker = user?.role === 'job-seeker';

  const handleHeartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isJobSeeker && onHeartClick) {
      onHeartClick(e, job._id);
    } else if (!user && onLoginPrompt) {
      onLoginPrompt();
    }
  };

  // Format location/country (same pattern as CompanyCard)
  const locationParts = [];
  if (job.city) {
    locationParts.push(job.city);
  }
  if (job.country) {
    const countryName = getCountryNameFromCode(job.country);
    locationParts.push(countryName || job.country);
  }
  const locationText = locationParts.length > 0
    ? locationParts.join(', ')
    : 'Location not specified';
  const updatedAgoText = formatUpdatedAgo(job.lastRecruiterEditAt || job.createdAt);

  return (
    <Link
      href={getJobUrl(job)}
      className={`group rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer block overflow-hidden transform hover:-translate-y-1 ${
        isFeatured
          ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300'
          : 'bg-white border border-gray-100'
      }`}
    >
      {/* Thumbnail Image - fixed height to prevent CLS */}
      <div className="w-full h-48 sm:h-56 bg-gray-200 relative overflow-hidden">
        {isFeatured && (
          <div className="absolute top-2 right-2 z-10 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-md text-xs font-bold shadow-md">
            ⭐ Featured
          </div>
        )}
        {showHeart && (
          <button
            type="button"
            onClick={handleHeartClick}
            disabled={isJobSeeker && togglingFavourite}
            className="absolute bottom-2 right-2 z-10 p-1.5 rounded-full bg-white/90 hover:bg-white shadow-md text-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-60"
            aria-label={isJobSeeker ? (isFavourite ? 'Remove from favourites' : 'Add to favourites') : 'Login to add to favourites'}
          >
            {isJobSeeker && isFavourite ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
              </svg>
            )}
          </button>
        )}
        {thumbnail ? (
          <JobCardImage src={thumbnail} alt={job.title} priority={priority} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
            <span className="text-gray-500 text-sm">No Image</span>
          </div>
        )}
      </div>

      {/* Job Info */}
      <div className="p-5 sm:p-6">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
          {job.title}
        </h3>
        {job.company ? (
          <p className="text-sm text-gray-600 mb-2 line-clamp-1" title={job.company}>
            {job.company}
          </p>
        ) : null}
        <p className="text-sm text-gray-600 flex items-center">
          <span className="mr-1.5">📍</span>
          <span className="line-clamp-1">{locationText}</span>
        </p>
        {updatedAgoText ? (
          <p className="text-sm text-gray-500 mt-1">
            Updated {updatedAgoText}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

