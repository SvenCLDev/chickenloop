import type { VerifiedCertificateFormEntry } from '@/app/components/talentNetwork/formTypes';
import { ISSUING_BODY_LABELS } from './constants';

export function isCompleteCertificateEntry(entry: VerifiedCertificateFormEntry): boolean {
  return Boolean(entry.issuingBody && entry.certificateLevel.trim());
}

export function formatCertificateLabel(
  entry: VerifiedCertificateFormEntry,
  index: number
): string {
  const level = entry.certificateLevel.trim() || `Certificate ${index + 1}`;
  if (entry.issuingBody) {
    const bodyLabel = ISSUING_BODY_LABELS[entry.issuingBody] ?? entry.issuingBody;
    return `${bodyLabel} ${level}`.trim();
  }
  return level;
}

export type CertificateMissingDocument = {
  index: number;
  label: string;
};

export function getCertificatesMissingDocument(
  entries: VerifiedCertificateFormEntry[]
): CertificateMissingDocument[] {
  return entries.flatMap((entry, index) => {
    if (!isCompleteCertificateEntry(entry) || entry.documentUrl.trim()) {
      return [];
    }
    return [{ index, label: formatCertificateLabel(entry, index) }];
  });
}
