import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CV from '@/models/CV';
import { requireRole } from '@/lib/auth';
import { generateProfileHeadline } from '@/lib/ai/generateProfileHeadline';
import type { ProfileHeadlineInput } from '@/lib/talentNetwork/profileHeadline';

function draftFromBody(body: unknown): ProfileHeadlineInput | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const raw = body as Record<string, unknown>;
  return {
    lookingForWorkInAreas: Array.isArray(raw.lookingForWorkInAreas)
      ? raw.lookingForWorkInAreas.map(String)
      : undefined,
    experienceAndSkill: Array.isArray(raw.experienceAndSkill)
      ? raw.experienceAndSkill.map(String)
      : undefined,
    verifiedCertificates: Array.isArray(raw.verifiedCertificates)
      ? (raw.verifiedCertificates as ProfileHeadlineInput['verifiedCertificates'])
      : undefined,
    seasonalExperience: Array.isArray(raw.seasonalExperience)
      ? (raw.seasonalExperience as ProfileHeadlineInput['seasonalExperience'])
      : undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['job-seeker']);
    await connectDB();

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const draft = draftFromBody(body);
    const hasDraft =
      draft &&
      ((draft.lookingForWorkInAreas?.length ?? 0) > 0 ||
        (draft.experienceAndSkill?.length ?? 0) > 0 ||
        (draft.verifiedCertificates?.length ?? 0) > 0 ||
        (draft.seasonalExperience?.length ?? 0) > 0);

    let input: ProfileHeadlineInput;
    if (hasDraft && draft) {
      input = draft;
    } else {
      const cv = await CV.findOne({ jobSeeker: user.userId }).lean();
      if (!cv) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }
      input = {
        lookingForWorkInAreas: (cv.lookingForWorkInAreas ?? []).map(String),
        experienceAndSkill: (cv.experienceAndSkill ?? []).map(String),
        verifiedCertificates: (cv.verifiedCertificates ?? []).map((c) => ({
          issuingBody: c.issuingBody,
          certificateLevel: c.certificateLevel,
          disciplines: c.disciplines,
          verificationStatus: c.verificationStatus,
        })),
        seasonalExperience: (cv.seasonalExperience ?? []).map((e) => ({
          role: e.role,
        })),
      };
    }

    const result = await generateProfileHeadline(input);
    return NextResponse.json(
      { headline: result.headline, source: result.source },
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
    if (errorMessage === 'PASSWORD_RESET_REQUIRED') {
      return NextResponse.json({ error: 'PASSWORD_RESET_REQUIRED' }, { status: 403 });
    }
    console.error('[generate-headline] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate headline' },
      { status: 500 }
    );
  }
}
