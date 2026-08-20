import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import {
  confirmReferenceToken,
  getReferenceConfirmContext,
} from '@/lib/talentNetwork/processReferenceRequests';
import { parseReferenceConfirmBody } from '@/lib/referenceVerificationToken';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    await connectDB();
    const { token } = await params;
    const context = await getReferenceConfirmContext(token);

    if (context.status === 'error') {
      return NextResponse.json(
        { error: context.error },
        { status: context.httpStatus ?? 400 }
      );
    }

    if (context.status === 'entry_removed') {
      return NextResponse.json(
        {
          candidateName: context.candidateName,
          schoolName: context.schoolName,
          seasonLabel: context.seasonLabel,
          responded: false,
          entryRemoved: true,
        },
        { status: 200 }
      );
    }

    if (context.status === 'responded') {
      return NextResponse.json(
        {
          candidateName: context.candidateName,
          schoolName: context.schoolName,
          seasonLabel: context.seasonLabel,
          responded: true,
          entryRemoved: false,
          worked: context.worked,
          rehire: context.rehire,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        candidateName: context.candidateName,
        schoolName: context.schoolName,
        seasonLabel: context.seasonLabel,
        responded: false,
        entryRemoved: false,
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
      return NextResponse.json(
        {
          error: result.error,
          ...(result.code ? { code: result.code } : {}),
        },
        { status: result.code === 'experience_removed' ? 410 : 400 }
      );
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
