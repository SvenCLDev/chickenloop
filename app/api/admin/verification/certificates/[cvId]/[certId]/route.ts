import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import CV from '@/models/CV';
import { requireRole } from '@/lib/auth';

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
    const adminNote = typeof body.adminNote === 'string' ? body.adminNote : undefined;

    if (action !== 'verify' && action !== 'reject') {
      return NextResponse.json(
        { error: 'action must be verify or reject' },
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
      cert.verificationStatus = 'unverified';
      cert.verifiedAt = undefined;
      cert.verifiedBy = undefined;
      if (adminNote) cert.adminNote = adminNote;
    }

    cv.markModified('verifiedCertificates');
    await cv.save();

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
