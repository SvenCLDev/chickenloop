import Link from 'next/link';
import Image from 'next/image';
import { stripHtmlToText } from '@/lib/sanitizeText';
import { talentProfilePath } from '@/lib/talentRoutes';

interface CandidateCardProps {
  candidate: {
    _id: string;
    fullName: string;
    summary?: string;
    experienceAndSkill?: string[];
    skills?: string[];
    pictures?: string[];
    verifiedCertCount?: number;
  };
}

export default function CandidateCard({ candidate }: CandidateCardProps) {
  // Get main skill/title - prioritize experienceAndSkill, then first skill from skills array
  const mainSkill = candidate.experienceAndSkill && candidate.experienceAndSkill.length > 0
    ? candidate.experienceAndSkill[0]
    : candidate.skills && candidate.skills.length > 0
      ? candidate.skills[0]
      : 'Professional';

  return (
    <Link
      href={talentProfilePath(candidate._id)}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer block overflow-hidden transform hover:-translate-y-1 border border-gray-100"
    >
      {/* Candidate Picture */}
      <div className="w-full h-48 sm:h-56 bg-gray-200 relative overflow-hidden">
        {candidate.pictures && candidate.pictures.length > 0 ? (
          <Image
            src={candidate.pictures[0]}
            alt={candidate.fullName}
            fill
            className="object-cover transition-transform duration-300 hover:scale-110"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
            <span className="text-gray-500 text-sm">No Image</span>
          </div>
        )}
      </div>

      {/* Candidate Info */}
      <div className="p-5 sm:p-6">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
          {candidate.fullName}
        </h3>
        {(candidate.verifiedCertCount ?? 0) > 0 && (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 mb-2">
            {candidate.verifiedCertCount} verified cert{(candidate.verifiedCertCount ?? 0) === 1 ? '' : 's'}
          </span>
        )}
        <p className="text-sm sm:text-base text-blue-600 font-medium mb-2">
          {mainSkill}
        </p>
        {candidate.summary && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-3">
            {stripHtmlToText(candidate.summary)}
          </p>
        )}
        <p className="text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors">
          View Full Profile →
        </p>
      </div>
    </Link>
  );
}









