import { isCompleteCertificateEntry } from '@/lib/talentNetwork/certificateVerification';
import type { VerifiedCertificateFormEntry } from './formTypes';

interface CertificateVerificationBadgeProps {
  cert: VerifiedCertificateFormEntry;
}

export default function CertificateVerificationBadge({ cert }: CertificateVerificationBadgeProps) {
  const status = cert.verificationStatus ?? 'unverified';
  const hasDocument = Boolean(cert.documentUrl.trim());

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

  if (!isCompleteCertificateEntry(cert)) {
    return null;
  }

  if (hasDocument) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
        Document uploaded
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
      Self-reported — upload document to verify
    </span>
  );
}
