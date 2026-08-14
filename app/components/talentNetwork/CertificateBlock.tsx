'use client';

import {
  DISCIPLINE_OPTIONS,
  ISSUING_BODY_OPTIONS,
  MONTH_OPTIONS,
} from '@/lib/talentNetwork/constants';
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
          Upload your credential card or diploma for Chickenloop verification.
        </p>
      </div>

      {certificates.map((cert, index) => (
        <div key={cert.clientId} className="border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-900">Certificate {index + 1}</h3>
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

          {cert.verificationStatus === 'verified' && (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
              Chickenloop Verified
            </span>
          )}
          {cert.verificationStatus === 'pending_review' && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              Pending review
            </span>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issuing body</label>
              <select
                value={cert.issuingBody}
                onChange={(e) => update(index, { issuingBody: e.target.value as VerifiedCertificateFormEntry['issuingBody'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Select...</option>
                {ISSUING_BODY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Certificate level</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">License / Member ID</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Document (PDF or image)</label>
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
      ))}

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
