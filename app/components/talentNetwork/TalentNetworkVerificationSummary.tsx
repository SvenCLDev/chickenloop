import { buildTalentNetworkVerificationSummary } from '@/lib/talentNetwork/verificationSummary';
import type {
  LanguageSkill,
  SeasonalExperience,
  VerifiedCertificate,
} from '@/lib/talentNetwork/types';

interface TalentNetworkVerificationSummaryProps {
  cv: {
    verifiedCertificates?: VerifiedCertificate[];
    seasonalExperience?: SeasonalExperience[];
    languageSkills?: LanguageSkill[];
  };
}

export default function TalentNetworkVerificationSummary({
  cv,
}: TalentNetworkVerificationSummaryProps) {
  const summary = buildTalentNetworkVerificationSummary(cv);
  const hasPending = summary.pendingItems.length > 0;
  const hasVerified = summary.verifiedItems.length > 0;

  return (
    <section className="mb-8 rounded-lg border border-blue-200 bg-blue-50/60 p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Verification status</h2>
        <p className="text-sm text-gray-600 mt-1">
          Track what Chickenloop has verified and what is still pending on your profile.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-md bg-white p-4 border border-gray-200">
          <p className="text-sm font-medium text-gray-700">Certificates</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{summary.certificates.verified}</p>
          <p className="text-xs text-gray-500">verified</p>
          <p className="mt-2 text-sm text-amber-700">
            {summary.certificates.pendingReview} pending review
          </p>
          {summary.certificates.unverified > 0 && (
            <p className="text-sm text-gray-600">{summary.certificates.unverified} not submitted</p>
          )}
        </div>
        <div className="rounded-md bg-white p-4 border border-gray-200">
          <p className="text-sm font-medium text-gray-700">Work references</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{summary.references.confirmed}</p>
          <p className="text-xs text-gray-500">confirmed</p>
          {summary.references.requested > 0 && (
            <p className="mt-2 text-sm text-amber-700">
              {summary.references.requested} awaiting manager
            </p>
          )}
          {summary.references.disputed > 0 && (
            <p className="mt-2 text-sm text-red-700">
              {summary.references.disputed} employment disputed
            </p>
          )}
          {summary.references.selfReported > 0 && (
            <p className="text-sm text-gray-600">{summary.references.selfReported} self-reported</p>
          )}
        </div>
        <div className="rounded-md bg-white p-4 border border-gray-200">
          <p className="text-sm font-medium text-gray-700">Languages</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{summary.languages.endorsed}</p>
          <p className="text-xs text-gray-500">endorsed</p>
          {summary.languages.selfAssessed > 0 && (
            <p className="mt-2 text-sm text-gray-600">
              {summary.languages.selfAssessed} self-assessed
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-amber-800 mb-2">Still pending</h3>
          {!hasPending ? (
            <p className="text-sm text-gray-600">Nothing pending right now.</p>
          ) : (
            <ul className="space-y-2">
              {summary.pendingItems.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-2"
                >
                  <span className="text-amber-600 mt-0.5" aria-hidden>
                    ○
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-emerald-800 mb-2">Verified</h3>
          {!hasVerified ? (
            <p className="text-sm text-gray-600">No verified items yet.</p>
          ) : (
            <ul className="space-y-2">
              {summary.verifiedItems.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-gray-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2"
                >
                  <span className="text-emerald-600 mt-0.5" aria-hidden>
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
