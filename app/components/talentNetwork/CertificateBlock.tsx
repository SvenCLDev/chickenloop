'use client';

import {
  isCompleteCertificateEntry,
} from '@/lib/talentNetwork/certificateVerification';
import {
  DISCIPLINE_OPTIONS,
  ISSUING_BODY_OPTIONS,
} from '@/lib/talentNetwork/constants';
import CertificateVerificationBadge from './CertificateVerificationBadge';
import type { VerifiedCertificateFormEntry } from './formTypes';
import { emptyCertificate } from './formTypes';

interface CertificateBlockProps {
  certificates: VerifiedCertificateFormEntry[];
  onChange: (certificates: VerifiedCertificateFormEntry[]) => void;
  onUploadDocument: (index: number, file: File) => Promise<void>;
  uploadingIndex: number | null;
}

export default function CertificateBlock({
  certificates,
  onChange,
  onUploadDocument,
  uploadingIndex,
}: CertificateBlockProps) {
  const update = (index: number, patch: Partial<VerifiedCertificateFormEntry>) => {
    const next = [...certificates];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const toggleDiscipline = (index: number, discipline: string) => {
    const current = certificates[index].disciplines;
    const next = current.includes(discipline)
      ? current.filter((d) => d !== discipline)
      : [...current, discipline];
    update(index, { disciplines: next });
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Professional Certificates</h2>
        <p className="text-sm text-gray-600 mt-1">
          <strong className="font-medium text-gray-800">
            Verified certificates stand out to recruiters.
          </strong>{' '}
          Upload a photo or PDF of your credential card to request Chickenloop verification. You can
          also save without a document and add one later.
        </p>
      </div>

      {certificates.map((cert, index) => {
        const missingDocument =
          isCompleteCertificateEntry(cert) && !cert.documentUrl.trim();

        return (
          <div
            key={cert.clientId}
            id={`certificate-entry-${index}`}
            className={`rounded-lg p-4 space-y-4 ${
              missingDocument
                ? 'border-2 border-amber-200 bg-amber-50/30'
                : 'border border-gray-200'
            }`}
          >
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h3 className="font-medium text-gray-900">Certificate {index + 1}</h3>
              <div className="flex items-center gap-2">
                <CertificateVerificationBadge cert={cert} />
                {certificates.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onChange(certificates.filter((_, i) => i !== index))}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issuing body</label>
                <select
                  value={cert.issuingBody}
                  onChange={(e) =>
                    update(index, {
                      issuingBody: e.target.value as VerifiedCertificateFormEntry['issuingBody'],
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select...</option>
                  {ISSUING_BODY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certificate level
                </label>
                <input
                  type="text"
                  value={cert.certificateLevel}
                  onChange={(e) => update(index, { certificateLevel: e.target.value })}
                  placeholder="e.g. Level 2 Instructor"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License / Member ID
                </label>
                <input
                  type="text"
                  value={cert.licenseMemberId}
                  onChange={(e) => update(index, { licenseMemberId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issue date</label>
                <input
                  type="date"
                  value={cert.issueDate}
                  onChange={(e) => update(index, { issueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry date</label>
                <input
                  type="date"
                  value={cert.expiryDate}
                  onChange={(e) => update(index, { expiryDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Disciplines</label>
              <div className="flex flex-wrap gap-2">
                {DISCIPLINE_OPTIONS.map((discipline) => (
                  <button
                    key={discipline}
                    type="button"
                    onClick={() => toggleDiscipline(index, discipline)}
                    className={`px-3 py-1 rounded-full text-sm border ${
                      cert.disciplines.includes(discipline)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    {discipline}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Verification document (photo or PDF)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Required for Chickenloop to verify this certificate.
              </p>
              <input
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) await onUploadDocument(index, file);
                }}
                className="w-full text-sm"
              />
              {uploadingIndex === index && (
                <p className="text-sm text-gray-500 mt-1">Uploading...</p>
              )}
              {cert.documentUrl && (
                <a
                  href={cert.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                >
                  View uploaded document
                </a>
              )}
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onChange([...certificates, emptyCertificate()])}
        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
      >
        + Add another certificate
      </button>
    </section>
  );
}
