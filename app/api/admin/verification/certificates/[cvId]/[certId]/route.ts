import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import CV from '@/models/CV';
import User from '@/models/User';
import { requireRole } from '@/lib/auth';
import { ISSUING_BODY_LABELS } from '@/lib/talentNetwork/constants';
import { sendCertificateVerificationRejected } from '@/lib/email/sendCertificateVerificationRejected';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cvId: string; certId: string }> }
) {
  try {
    const admin = await requireRole(request, ['admin']);
    await connectDB();
    const { cvId, certId } = await params;

    if (
      !mongoose.Types.ObjectId.isValid(cvId) ||
      !mongoose.Types.ObjectId.isValid(certId)
    ) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = await request.json();
    const action = body.action as 'verify' | 'reject';
    const adminNote =
      typeof body.adminNote === 'string' ? body.adminNote.trim() : undefined;

    if (action !== 'verify' && action !== 'reject') {
      return NextResponse.json(
        { error: 'action must be verify or reject' },
        { status: 400 }
      );
    }

    if (action === 'reject' && !adminNote) {
      return NextResponse.json(
        { error: 'A rejection reason is required' },
        { status: 400 }
      );
    }

    const cv = await CV.findById(cvId);
    if (!cv) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const cert = cv.verifiedCertificates?.find(
      (c) => String(c._id) === certId
    );
    if (!cert) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    if (action === 'verify') {
      cert.verificationStatus = 'verified';
      cert.verifiedAt = new Date();
      cert.verifiedBy = new mongoose.Types.ObjectId(admin.userId);
      if (adminNote) cert.adminNote = adminNote;
    } else {
      cert.verificationStatus = 'rejected';
      cert.verifiedAt = undefined;
      cert.verifiedBy = undefined;
      cert.adminNote = adminNote;
    }

    cv.markModified('verifiedCertificates');
    await cv.save();

    if (action === 'reject' && adminNote) {
      try {
        const seeker = cv.jobSeeker
          ? await User.findById(cv.jobSeeker).select('name email').lean()
          : null;
        const seekerEmail =
          (typeof seeker?.email === 'string' && seeker.email.trim()) ||
          (typeof cv.email === 'string' && cv.email.trim()) ||
          '';
        if (seekerEmail) {
          const bodyLabel =
            ISSUING_BODY_LABELS[
              cert.issuingBody as keyof typeof ISSUING_BODY_LABELS
            ] ?? String(cert.issuingBody ?? '');
          const certificateLabel =
            `${bodyLabel} ${cert.certificateLevel ?? ''}`.trim() ||
            'your certificate';
          const result = await sendCertificateVerificationRejected({
            seekerEmail,
            seekerName:
              (typeof seeker?.name === 'string' && seeker.name) ||
              (typeof cv.fullName === 'string' ? cv.fullName : undefined),
            seekerUserId: cv.jobSeeker ? String(cv.jobSeeker) : undefined,
            certificateLabel,
            reason: adminNote,
          });
          if (!result.success) {
            console.error(
              '[certificate-verification] reject email failed:',
              result.error
            );
          }
        } else {
          console.error(
            '[certificate-verification] reject email skipped: no seeker email'
          );
        }
      } catch (emailError) {
        console.error(
          '[certificate-verification] reject email error:',
          emailError
        );
      }
    }

    return NextResponse.json(
      { message: `Certificate ${action === 'verify' ? 'verified' : 'rejected'}`, cv },
      { status: 200 }
    );
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
