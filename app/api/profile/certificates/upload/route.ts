import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { canUserWriteTalentNetworkFields } from '@/lib/talentNetwork/userContext';
import { uploadCertificateDocument } from '@/lib/talentNetwork/uploadCertificateDocument';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['job-seeker', 'admin']);
    const canUpload = await canUserWriteTalentNetworkFields(user.userId);
    if (!canUpload) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('document') as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const url = await uploadCertificateDocument(file);

    return NextResponse.json(
      { message: 'Certificate document uploaded', url },
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
    if (
      errorMessage.includes('Invalid file type') ||
      errorMessage.includes('maximum size')
    ) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}
