import Link from 'next/link';
import { stripHtmlToText } from '@/lib/sanitizeText';
import { talentProfilePath } from '@/lib/talentRoutes';
import { getDisplayHeadline } from '@/lib/talentNetwork/profileHeadline';
import { AVAILABILITY_LABELS } from '@/lib/talentNetwork/preferenceLabels';
import JobCardImage from '@/app/components/JobCardImage';

const CARD_AVAILABILITY_VALUES = new Set([
  'available_now',
  'available_soon',
  'seasonal',
]);

const MAX_ACTIVITY_CHIPS = 3;

interface CandidateCardProps {
  candidate: {
    _id: string;
    fullName: string;
    profileHeadline?: string;
    summary?: string;
    availability?: string;
    experienceAndSkill?: string[];
    lookingForWorkInAreas?: string[];
    skills?: string[];
    pictures?: string[];
  };
}

export default function CandidateCard({ candidate }: CandidateCardProps) {
  const headline = getDisplayHeadline(candidate);
  const thumbnail =
    candidate.pictures && candidate.pictures.length > 0 ? candidate.pictures[0] : null;
  const summary = candidate.summary ? stripHtmlToText(candidate.summary) : '';
  const availabilityLabel =
    candidate.availability && CARD_AVAILABILITY_VALUES.has(candidate.availability)
      ? AVAILABILITY_LABELS[candidate.availability]
      : null;
  const activities = (candidate.experienceAndSkill ?? [])
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, MAX_ACTIVITY_CHIPS);

  return (
    <Link
      href={talentProfilePath(candidate._id)}
      className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer block overflow-hidden transform hover:-translate-y-1 border border-gray-100"
    >
      <div className="w-full h-48 sm:h-56 bg-gray-200 relative overflow-hidden">
        {thumbnail ? (
          <JobCardImage src={thumbnail} alt={headline || 'Profile photo'} />
        ) : null}
      </div>

      <div className="p-5 sm:p-6">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {headline}
        </h3>
        <p className="text-sm text-gray-600 mb-2 line-clamp-1" title={candidate.fullName}>
          {candidate.fullName}
        </p>
        {availabilityLabel ? (
          <div className="mb-2">
            <span className="inline-flex items-center rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-800">
              {availabilityLabel}
            </span>
          </div>
        ) : null}
        {summary ? (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{summary}</p>
        ) : null}
        {activities.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {activities.map((activity) => (
              <span
                key={activity}
                className="inline-flex max-w-full items-center truncate rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                title={activity}
              >
                {activity}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
