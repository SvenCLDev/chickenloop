'use client';

import Link from 'next/link';
import { stripHtmlToText } from '@/lib/sanitizeText';
import type { CandidateListItem } from '@/lib/candidateListTypes';
import { talentProfilePath } from '@/lib/talentRoutes';

const EXPERIENCE_LEVEL_LABELS: Record<string, string> = {
  entry: 'Entry',
  intermediate: 'Intermediate',
  experienced: 'Experienced',
  senior: 'Senior',
};

const AVAILABILITY_LABELS: Record<string, string> = {
  available_now: 'Available now',
  available_soon: 'Available soon',
  seasonal: 'Seasonal',
  not_available: 'Not available',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getTimeAgo(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo ago`;
  return `${Math.floor(diffInMonths / 12)}y ago`;
}

type TalentListRowProps = {
  candidate: CandidateListItem;
  showFavourite?: boolean;
  isFavourite?: boolean;
  togglingFavourite?: boolean;
  onToggleFavourite?: (e: React.MouseEvent, cvId: string) => void;
};

export default function TalentListRow({
  candidate,
  showFavourite = false,
  isFavourite = false,
  togglingFavourite = false,
  onToggleFavourite,
}: TalentListRowProps) {
  const picture = candidate.pictures?.[0] || null;
  const primaryRole =
    candidate.lookingForWorkInAreas?.[0] ||
    candidate.experienceAndSkill?.[0] ||
    null;
  const secondarySkills = (candidate.experienceAndSkill || []).slice(0, 2).join(' · ');
  const verifiedCount = candidate.verifiedCertCount ?? 0;
  const referenceCount = candidate.confirmedReferenceCount ?? 0;
  const certLabels =
    candidate.verifiedCertLabels?.filter(Boolean) ||
    (candidate.professionalCertifications || []).slice(0, 2);
  const languages = (candidate.languages || []).slice(0, 2);
  const lastActive =
    candidate.jobSeeker?.lastOnline ||
    candidate.jobSeeker?.updatedAt ||
    candidate.updatedAt;
  const summary = candidate.summary ? stripHtmlToText(candidate.summary) : '';

  return (
    <div
      className={`relative group bg-white rounded-xl border transition-all duration-200 hover:shadow-md hover:border-blue-200 ${
        candidate.featured
          ? 'border-amber-300 ring-1 ring-amber-200/60'
          : 'border-gray-200 shadow-sm'
      }`}
    >
      <div className="flex gap-4 p-4 sm:p-5">
        <Link href={talentProfilePath(candidate._id)} className="shrink-0">
          {picture ? (
            <img
              src={picture}
              alt={candidate.fullName}
              className="w-14 h-14 rounded-full object-cover object-top bg-gray-100"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
              {getInitials(candidate.fullName)}
            </div>
          )}
        </Link>

        <div className="min-w-0 flex-1 pr-8">
          <div className="flex flex-wrap items-start gap-x-2 gap-y-1 mb-1">
            <Link
              href={talentProfilePath(candidate._id)}
              className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors truncate"
            >
              {candidate.fullName}
            </Link>
            {candidate.featured && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                Featured
              </span>
            )}
          </div>

          {primaryRole && (
            <p className="text-sm font-medium text-gray-600 mb-1">{primaryRole}</p>
          )}
          {secondarySkills && secondarySkills !== primaryRole && (
            <p className="text-sm text-gray-600 mb-2">{secondarySkills}</p>
          )}

          <div className="flex flex-wrap gap-1.5 mb-2">
            {verifiedCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                {verifiedCount} verified cert{verifiedCount === 1 ? '' : 's'}
              </span>
            )}
            {referenceCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
                {referenceCount} confirmed ref{referenceCount === 1 ? '' : 's'}
              </span>
            )}
            {certLabels.map((label) => (
              <span
                key={label}
                className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {languages.map((lang) => (
              <span
                key={lang}
                className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-800"
              >
                {lang}
              </span>
            ))}
            {candidate.availability && (
              <span className="inline-flex items-center rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-800">
                {AVAILABILITY_LABELS[candidate.availability] || candidate.availability}
              </span>
            )}
            {candidate.experienceLevel && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                {EXPERIENCE_LEVEL_LABELS[candidate.experienceLevel] || candidate.experienceLevel}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            {candidate.address && <span>Based in {candidate.address}</span>}
            {lastActive && <span>Active {getTimeAgo(lastActive)}</span>}
          </div>

          {summary && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">{summary}</p>
          )}
        </div>
      </div>

      {showFavourite && onToggleFavourite && (
        <button
          type="button"
          onClick={(e) => onToggleFavourite(e, candidate._id)}
          disabled={togglingFavourite}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/90 border border-gray-200 shadow-sm hover:bg-gray-50 disabled:opacity-50 z-10"
          aria-label={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
        >
          <span className={isFavourite ? 'text-red-500' : 'text-gray-400'}>
            {isFavourite ? '♥' : '♡'}
          </span>
        </button>
      )}
    </div>
  );
}
