import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { requireRole } from '@/lib/auth';
import SurveyResponse from '@/models/SurveyResponse';
import { getActiveSurveysForAudience } from '@/lib/surveys';
import { shouldOfferSurvey } from '@/lib/surveys/eligibility';

/**
 * GET — return the next survey a recruiter should see (or null).
 * Admins and job seekers are forbidden by requireRole.
 */
export async function GET(request: NextRequest) {
  try {
    // Skip company profile gate so survey can still run for recruiters setting up
    const user = await requireRole(request, ['recruiter'], { skipCompanyProfileCheck: true });
    await connectDB();

    const activeSurveys = getActiveSurveysForAudience('recruiter');
    if (activeSurveys.length === 0) {
      return NextResponse.json({ survey: null }, { status: 200 });
    }

    const surveyIds = activeSurveys.map((s) => s.id);
    const responses = await SurveyResponse.find({
      userId: user.userId,
      surveyId: { $in: surveyIds },
    })
      .select('surveyId dismissed completedAt remindLaterUntil')
      .lean();

    const responseBySurveyId = new Map(responses.map((r) => [r.surveyId, r]));
    const now = new Date();

    for (const survey of activeSurveys) {
      const existing = responseBySurveyId.get(survey.id);
      if (shouldOfferSurvey(existing, now)) {
        return NextResponse.json({ survey }, { status: 200 });
      }
    }

    return NextResponse.json({ survey: null }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (message === 'PASSWORD_RESET_REQUIRED') {
      return NextResponse.json({ error: 'PASSWORD_RESET_REQUIRED' }, { status: 403 });
    }
    if (message === 'Forbidden' || message === 'COMPANY_PROFILE_INCOMPLETE' || message === 'COMPANY_MISSING') {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error('[API /surveys/active]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
