import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ReferenceVerificationToken from '@/models/ReferenceVerificationToken';
import { confirmReferenceToken } from '@/lib/talentNetwork/processReferenceRequests';
import { parseReferenceConfirmBody } from '@/lib/referenceVerificationToken';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    await connectDB();
    const { token } = await params;
    const tokenDoc = await ReferenceVerificationToken.findOne({ token }).lean();
    if (!tokenDoc) {
      return NextResponse.json({ error: 'Invalid reference link' }, { status: 404 });
    }
    if (tokenDoc.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Reference link expired' }, { status: 410 });
    }
    return NextResponse.json(
      {
        candidateName: tokenDoc.candidateName,
        schoolName: tokenDoc.schoolName,
        seasonLabel: tokenDoc.seasonLabel,
        responded: !!tokenDoc.respondedAt,
        worked:
          tokenDoc.workConfirmed === false
            ? false
            : tokenDoc.workConfirmed === true ||
              tokenDoc.confirmed === true ||
              tokenDoc.rehire !== undefined
              ? true
              : undefined,
        rehire: tokenDoc.rehire,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    await connectDB();
    const { token } = await params;
    const body = await request.json().catch(() => ({}));
    const response = parseReferenceConfirmBody(body);
    if (!response) {
      return NextResponse.json({ error: 'Invalid reference response' }, { status: 400 });
    }

    const result = await confirmReferenceToken(token, response);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: 'Thank you for confirming this reference',
        candidateName: result.candidateName,
        worked: result.worked,
        rehire: result.rehire,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
