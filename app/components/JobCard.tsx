import Link from 'next/link';
import Image from 'next/image';
import { getCountryNameFromCode } from '@/lib/countryUtils';
import { getJobUrl } from '@/lib/jobSlug';

interface JobCardProps {
  job: {
    _id: string;
    title: string;
    company?: string;
    city: string;
    country?: string;
    pictures?: string[];
    featured?: boolean;
  };
  /** Set true only for the first visible job card (LCP optimization). */
  priority?: boolean;
  /** Force featured styling (e.g. when used in Featured Jobs section). */
  featured?: boolean;
}

export default function JobCard({ job, priority = false, featured: featuredProp }: JobCardProps) {
  const isFeatured = featuredProp ?? job.featured ?? false;
  const thumbnail = job.pictures && job.pictures.length > 0 ? job.pictures[0] : null;

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

  return (
    <Link
      href={getJobUrl(job)}
      className={`rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer block overflow-hidden transform hover:-translate-y-1 ${
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
        {thumbnail ? (
          priority ? (
            <Image
              src={thumbnail}
              alt={job.title}
              fill
              priority
              fetchPriority="high"
              loading="eager"
              quality={60}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 hover:scale-110"
            />
          ) : (
            <Image
              src={thumbnail}
              alt={job.title}
              fill
              loading="lazy"
              quality={60}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 hover:scale-110"
            />
          )
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
      </div>
    </Link>
  );
}

