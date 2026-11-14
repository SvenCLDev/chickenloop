import Link from 'next/link';
import { stripHtmlToText } from '@/lib/sanitizeText';
import { talentProfilePath } from '@/lib/talentRoutes';
import { getDisplayHeadline } from '@/lib/talentNetwork/profileHeadline';
import JobCardImage from '@/app/components/JobCardImage';

interface CandidateCardProps {
  candidate: {
    _id: string;
    fullName: string;
    profileHeadline?: string;
    summary?: string;
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

  return (
    <Link
      href={talentProfilePath(candidate._id)}
      className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer block overflow-hidden transform hover:-translate-y-1 border border-gray-100"
    >
      <div className="w-full h-48 sm:h-56 bg-gray-200 relative overflow-hidden">
        {thumbnail ? <JobCardImage src={thumbnail} alt={candidate.fullName} /> : null}
      </div>

      <div className="p-5 sm:p-6">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {headline}
        </h3>
        <p className="text-sm text-gray-600 mb-2 line-clamp-1" title={candidate.fullName}>
          {candidate.fullName}
        </p>
        {summary ? (
          <p className="text-sm text-gray-600 line-clamp-2">{summary}</p>
        ) : null}
      </div>
    </Link>
  );
}
