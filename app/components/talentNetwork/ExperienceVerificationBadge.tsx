interface ExperienceVerificationBadgeProps {
  status?: string;
  referenceEmail?: string;
  /** When false, only verified references are shown (recruiter view). */
  showOwnerStatus?: boolean;
  /** Longer self-reported label on the edit form. */
  editForm?: boolean;
}

export default function ExperienceVerificationBadge({
  status,
  referenceEmail,
  showOwnerStatus = true,
  editForm = false,
}: ExperienceVerificationBadgeProps) {
  if (status === 'reference_confirmed') {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
        Verified reference
      </span>
    );
  }
  if (!showOwnerStatus) return null;
  if (status === 'reference_requested') {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
        Awaiting manager response
      </span>
    );
  }
  if (referenceEmail?.trim()) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
        Reference not confirmed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
      {editForm ? 'Self-reported — add manager email to verify' : 'Self-reported'}
    </span>
  );
}
