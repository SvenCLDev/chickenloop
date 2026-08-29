import {
  formatCertificateLabel,
  getCertificatesMissingDocument,
  isCompleteCertificateEntry,
} from '@/lib/talentNetwork/certificateVerification';
import type { VerifiedCertificateFormEntry } from '@/app/components/talentNetwork/formTypes';

function entry(overrides: Partial<VerifiedCertificateFormEntry> = {}): VerifiedCertificateFormEntry {
  return {
    clientId: '1',
    issuingBody: 'IKO',
    certificateLevel: 'Level 2',
    disciplines: [],
    licenseMemberId: '',
    issueDate: '',
    expiryDate: '',
    documentUrl: '',
    verificationStatus: 'unverified',
    ...overrides,
  };
}

describe('certificateVerification', () => {
  describe('isCompleteCertificateEntry', () => {
    it('returns true when issuing body and level are filled', () => {
      expect(isCompleteCertificateEntry(entry())).toBe(true);
    });

    it('returns false when issuing body is missing', () => {
      expect(isCompleteCertificateEntry(entry({ issuingBody: '' }))).toBe(false);
    });

    it('returns false when certificate level is missing', () => {
      expect(isCompleteCertificateEntry(entry({ certificateLevel: '' }))).toBe(false);
    });
  });

  describe('formatCertificateLabel', () => {
    it('formats issuing body and level', () => {
      expect(formatCertificateLabel(entry(), 0)).toBe('IKO Level 2');
    });
  });

  describe('getCertificatesMissingDocument', () => {
    it('returns complete entries without a document', () => {
      expect(
        getCertificatesMissingDocument([
          entry(),
          entry({ clientId: '2', documentUrl: 'https://example.com/cert.pdf' }),
          entry({ clientId: '3', issuingBody: '' }),
        ])
      ).toEqual([{ index: 0, label: 'IKO Level 2' }]);
    });

    it('returns empty when all complete entries have documents', () => {
      expect(
        getCertificatesMissingDocument([
          entry({ documentUrl: 'https://example.com/cert.pdf' }),
        ])
      ).toEqual([]);
    });
  });
});
