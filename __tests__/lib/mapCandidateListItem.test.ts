import { mapCvDocumentToCandidateListItem } from '@/lib/mapCandidateListItem';

describe('mapCvDocumentToCandidateListItem', () => {
  it('counts verified certs and confirmed references', () => {
    const item = mapCvDocumentToCandidateListItem({
      _id: 'cv1',
      fullName: 'Alex Rider',
      verifiedCertificates: [
        { verificationStatus: 'verified', issuingBody: 'IKO', certificateLevel: 'Level 2' },
        { verificationStatus: 'pending', issuingBody: 'VDWS', certificateLevel: 'B' },
      ],
      seasonalExperience: [
        { verificationStatus: 'confirmed' },
        { verificationStatus: 'pending' },
        { verificationStatus: 'confirmed' },
      ],
    });

    expect(item.verifiedCertCount).toBe(1);
    expect(item.confirmedReferenceCount).toBe(2);
    expect(item.verifiedCertLabels).toEqual(['IKO Level 2']);
  });

  it('derives featured from featuredUntil in the future', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const item = mapCvDocumentToCandidateListItem({
      _id: 'cv2',
      fullName: 'Bo Rider',
      featured: false,
      featuredUntil: future,
    });

    expect(item.featured).toBe(true);
  });

  it('maps job seeker lastOnline and updatedAt', () => {
    const item = mapCvDocumentToCandidateListItem({
      _id: 'cv3',
      fullName: 'Casey Rider',
      jobSeeker: {
        _id: 'user1',
        name: 'Casey Rider',
        email: 'casey@example.com',
        lastOnline: new Date('2026-03-01T10:00:00.000Z'),
        updatedAt: new Date('2026-03-01T09:00:00.000Z'),
      },
    });

    expect(item.jobSeeker).toEqual({
      _id: 'user1',
      name: 'Casey Rider',
      email: 'casey@example.com',
      lastOnline: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T09:00:00.000Z',
    });
  });
});
