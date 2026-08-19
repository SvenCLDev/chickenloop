import { ISSUING_BODY_LABELS, PROFICIENCY_LABELS } from '@/lib/talentNetwork/constants';
import type { IssuingBody } from '@/lib/talentNetwork/types';
import ExperienceVerificationBadge from './ExperienceVerificationBadge';

interface TalentNetworkProfileViewProps {
  cv: {
    verifiedCertificates?: Array<{
      issuingBody: IssuingBody;
      certificateLevel: string;
      disciplines?: string[];
      licenseMemberId?: string;
      issueDate?: string;
      expiryDate?: string;
      verificationStatus?: string;
    }>;
    seasonalExperience?: Array<{
      schoolName: string;
      role: string;
      startMonth?: number;
      startYear?: number;
      endMonth?: number | null;
      endYear?: number | null;
      seasonTag?: string;
      referenceEmail?: string;
      verificationStatus?: string;
      rehireAnswer?: boolean;
    }>;
    languageSkills?: Array<{
      language: string;
      proficiency: keyof typeof PROFICIENCY_LABELS;
      verificationStatus?: string;
    }>;
  };
  /** Show full pending/verified badges (job seeker viewing own profile) */
  showOwnerStatus?: boolean;
}

function CertificateStatusBadge({
  status,
  showOwnerStatus,
}: {
  status?: string;
  showOwnerStatus: boolean;
}) {
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
        Chickenloop Verified
      </span>
    );
  }
  if (status === 'pending_review') {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
        Pending review
      </span>
    );
  }
  if (showOwnerStatus) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
        Not yet verified
      </span>
    );
  }
  return null;
}

function LanguageStatusBadge({
  status,
  showOwnerStatus,
}: {
  status?: string;
  showOwnerStatus: boolean;
}) {
  if (status === 'endorsed') {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
        Endorsed
      </span>
    );
  }
  if (showOwnerStatus) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
        Self-assessed
      </span>
    );
  }
  return null;
}

export default function TalentNetworkProfileView({
  cv,
  showOwnerStatus = false,
}: TalentNetworkProfileViewProps) {
  const certs = cv.verifiedCertificates ?? [];
  const experience = cv.seasonalExperience ?? [];
  const languages = cv.languageSkills ?? [];

  return (
    <>
      {languages.length > 0 && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Language Skills</h2>
          <div className="flex flex-wrap gap-2">
            {languages.map((skill, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
              >
                {skill.language} · {PROFICIENCY_LABELS[skill.proficiency] ?? skill.proficiency}
                <LanguageStatusBadge
                  status={skill.verificationStatus}
                  showOwnerStatus={showOwnerStatus}
                />
              </span>
            ))}
          </div>
        </div>
      )}

      {certs.length > 0 && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Professional Certificates</h2>
          <div className="space-y-4">
            {certs.map((cert, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {ISSUING_BODY_LABELS[cert.issuingBody] ?? cert.issuingBody}{' '}
                    {cert.certificateLevel}
                  </h3>
                  <CertificateStatusBadge
                    status={cert.verificationStatus}
                    showOwnerStatus={showOwnerStatus}
                  />
                </div>
                {(cert.disciplines?.length ?? 0) > 0 && (
                  <p className="text-sm text-gray-600 mb-1">
                    Disciplines: {cert.disciplines?.join(', ')}
                  </p>
                )}
                {cert.licenseMemberId && (
                  <p className="text-sm text-gray-600">ID: {cert.licenseMemberId}</p>
                )}
                {(cert.issueDate || cert.expiryDate) && (
                  <p className="text-sm text-gray-500 mt-1">
                    {cert.issueDate ? `Issued ${String(cert.issueDate).slice(0, 10)}` : ''}
                    {cert.expiryDate ? ` · Expires ${String(cert.expiryDate).slice(0, 10)}` : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {experience.length > 0 && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Work Experience</h2>
          <div className="space-y-4">
            {experience.map((entry, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">{entry.role}</h3>
                      <ExperienceVerificationBadge
                        status={entry.verificationStatus}
                        referenceEmail={entry.referenceEmail}
                        showOwnerStatus={showOwnerStatus}
                      />
                    </div>
                    <p className="text-gray-600">{entry.schoolName}</p>
                    {entry.seasonTag && (
                      <p className="text-sm text-gray-500 mt-1">{entry.seasonTag}</p>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {entry.startMonth && entry.startYear
                      ? `${entry.startMonth}/${entry.startYear}`
                      : ''}
                    {entry.endMonth && entry.endYear
                      ? ` – ${entry.endMonth}/${entry.endYear}`
                      : entry.startMonth
                        ? ' – Present'
                        : ''}
                  </div>
                </div>
                {entry.rehireAnswer !== undefined && entry.verificationStatus === 'reference_confirmed' && (
                  <p className="text-sm text-gray-600 mt-2">
                    Manager rehire response: {entry.rehireAnswer ? 'Yes' : 'No'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
