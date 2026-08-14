import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CV from '@/models/CV';
import { requireRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);
    await connectDB();

    const status = request.nextUrl.searchParams.get('status') || 'pending_review';

    const cvs = await CV.find({
      'verifiedCertificates.verificationStatus': status,
    })
      .select('fullName email jobSeeker verifiedCertificates updatedAt')
      .populate('jobSeeker', 'name email')
      .lean();

    const queue = cvs.flatMap((cv) => {
      const certificates = (cv.verifiedCertificates ?? []).filter(
        (cert) => cert.verificationStatus === status
      );
      return certificates.map((cert) => ({
        cvId: String(cv._id),
        certId: String(cert._id),
        candidateName: cv.fullName,
        candidateEmail: cv.email,
        jobSeeker: cv.jobSeeker,
        certificate: cert,
        cvUpdatedAt: cv.updatedAt,
      }));
    });

    queue.sort(
      (a, b) =>
        new Date(a.cvUpdatedAt).getTime() - new Date(b.cvUpdatedAt).getTime()
    );

    return NextResponse.json({ queue, count: queue.length }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}
