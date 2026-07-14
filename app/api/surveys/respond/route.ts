import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { requireRole } from '@/lib/auth';
import SurveyResponse from '@/models/SurveyResponse';
import { getSurveyById } from '@/lib/surveys';
import { getRemindLaterUntil } from '@/lib/surveys/eligibility';

type SurveyAction = 'complete' | 'remind_later' | 'dismiss';

/**
 * POST — record a survey response action for the authenticated recruiter.
 * Body: { surveyId, action, primaryAnswer?, secondaryAnswer?, freeText? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['recruiter'], { skipCompanyProfileCheck: true });
    await connectDB();

    const body = await request.json();
    const surveyId = typeof body.surveyId === 'string' ? body.surveyId.trim() : '';
    const action = body.action as SurveyAction;

    if (!surveyId) {
      return NextResponse.json({ error: 'surveyId is required' }, { status: 400 });
    }

    const survey = getSurveyById(surveyId);
    if (!survey || !survey.active || survey.audience !== 'recruiter') {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    if (action !== 'complete' && action !== 'remind_later' && action !== 'dismiss') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const now = new Date();
    let update: Record<string, unknown>;

    if (action === 'dismiss') {
      update = {
        dismissed: true,
        remindLaterUntil: null,
        completedAt: null,
        primaryAnswer: null,
        secondaryAnswer: null,
        freeText: null,
      };
    } else if (action === 'remind_later') {
      update = {
        dismissed: false,
        remindLaterUntil: getRemindLaterUntil(now),
        completedAt: null,
      };
    } else {
      const primaryAnswer =
        typeof body.primaryAnswer === 'string' ? body.primaryAnswer.trim() : '';
      const secondaryAnswer =
        typeof body.secondaryAnswer === 'string' ? body.secondaryAnswer.trim() : '';
      const freeText =
        typeof body.freeText === 'string' ? body.freeText.trim().slice(0, 2000) : '';

      const primaryQuestion = survey.questions.find((q) => q.mapsTo === 'primaryAnswer');
      const secondaryQuestion = survey.questions.find((q) => q.mapsTo === 'secondaryAnswer');

      if (primaryQuestion?.required) {
        const allowed = new Set((primaryQuestion.options || []).map((o) => o.value));
        if (!primaryAnswer || !allowed.has(primaryAnswer)) {
          return NextResponse.json({ error: 'Please answer the first question' }, { status: 400 });
        }
      }

      if (secondaryQuestion?.required) {
        const allowed = new Set((secondaryQuestion.options || []).map((o) => o.value));
        if (!secondaryAnswer || !allowed.has(secondaryAnswer)) {
          return NextResponse.json({ error: 'Please answer the second question' }, { status: 400 });
        }
      }

      update = {
        dismissed: false,
        remindLaterUntil: null,
        completedAt: now,
        primaryAnswer: primaryAnswer || null,
        secondaryAnswer: secondaryAnswer || null,
        freeText: freeText || null,
      };
    }

    const response = await SurveyResponse.findOneAndUpdate(
      { userId: user.userId, surveyId },
      {
        $set: update,
        $setOnInsert: { userId: user.userId, surveyId },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json(
      {
        success: true,
        action,
        response: {
          id: String(response._id),
          surveyId: response.surveyId,
          dismissed: response.dismissed,
          remindLaterUntil: response.remindLaterUntil,
          completedAt: response.completedAt,
        },
      },
      { status: 200 }
    );
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
    console.error('[API /surveys/respond]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
