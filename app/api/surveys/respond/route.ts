import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { requireRole } from '@/lib/auth';
import SurveyResponse from '@/models/SurveyResponse';
import { getSurveyById } from '@/lib/surveys';
import { getRemindLaterUntil } from '@/lib/surveys/eligibility';
import { PAYMENT_INTEREST_BY_SECONDARY } from '@/lib/surveys/types';

type SurveyAction = 'complete' | 'remind_later' | 'dismiss';

/**
 * POST — record a survey response action for the authenticated recruiter.
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
        otherText: null,
        freeText: null,
        problemCategory: null,
        paymentInterest: null,
        pricePointShown: null,
        priceResponse: null,
        priceAccepted: null,
        earlyAccessInterested: null,
        magicWish: null,
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
      const otherText =
        typeof body.otherText === 'string' ? body.otherText.trim().slice(0, 2000) : '';
      const freeText =
        typeof body.freeText === 'string' ? body.freeText.trim().slice(0, 2000) : '';
      const magicWish =
        typeof body.magicWish === 'string' ? body.magicWish.trim().slice(0, 1000) : '';
      const priceResponseRaw =
        typeof body.priceResponse === 'string' ? body.priceResponse.trim() : '';

      const primaryQuestion = survey.questions.find((q) => q.mapsTo === 'primaryAnswer');
      const secondaryQuestion = survey.questions.find((q) => q.mapsTo === 'secondaryAnswer');
      const pricingStep = survey.pricingStep;

      if (primaryQuestion?.required) {
        const allowed = new Set((primaryQuestion.options || []).map((o) => o.value));
        if (!primaryAnswer || !allowed.has(primaryAnswer)) {
          return NextResponse.json({ error: 'Please answer the first question' }, { status: 400 });
        }
      }

      const selectedPrimary = (primaryQuestion?.options || []).find((o) => o.value === primaryAnswer);
      if (selectedPrimary?.showOtherText && !otherText) {
        return NextResponse.json(
          { error: 'Please tell us more about “Other”' },
          { status: 400 }
        );
      }

      if (secondaryQuestion?.required) {
        const allowed = new Set((secondaryQuestion.options || []).map((o) => o.value));
        if (!secondaryAnswer || !allowed.has(secondaryAnswer)) {
          return NextResponse.json({ error: 'Please answer the second question' }, { status: 400 });
        }
      }

      const paymentInterest = PAYMENT_INTEREST_BY_SECONDARY[secondaryAnswer] || null;
      const showPricing =
        !!pricingStep && pricingStep.showWhenPaymentInterest.includes(secondaryAnswer);

      let priceResponse: 'likely' | 'maybe' | 'rejected' | null = null;
      let pricePointShown: number | null = null;
      let priceAccepted: boolean | null = null;
      let earlyAccessInterested: boolean | null = null;

      if (showPricing && pricingStep) {
        const allowedPrice = new Set(pricingStep.options.map((o) => o.value));
        if (!priceResponseRaw || !allowedPrice.has(priceResponseRaw)) {
          return NextResponse.json({ error: 'Please answer the pricing question' }, { status: 400 });
        }
        priceResponse = priceResponseRaw as 'likely' | 'maybe' | 'rejected';
        pricePointShown = pricingStep.priceEur;
        priceAccepted = priceResponse === 'likely' || priceResponse === 'maybe';

        const showEarlyAccess = pricingStep.earlyAccess.showWhenPriceResponse.includes(priceResponse);
        if (showEarlyAccess) {
          if (body.earlyAccessInterested !== true && body.earlyAccessInterested !== false) {
            return NextResponse.json(
              { error: 'Please answer the early access question' },
              { status: 400 }
            );
          }
          earlyAccessInterested = body.earlyAccessInterested === true;
        } else {
          earlyAccessInterested = false;
        }
      }

      update = {
        dismissed: false,
        remindLaterUntil: null,
        completedAt: now,
        primaryAnswer: primaryAnswer || null,
        secondaryAnswer: secondaryAnswer || null,
        otherText: selectedPrimary?.showOtherText ? otherText || null : null,
        freeText: freeText || null,
        problemCategory: primaryAnswer || null,
        paymentInterest,
        pricePointShown,
        priceResponse,
        priceAccepted,
        earlyAccessInterested,
        magicWish: magicWish || null,
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
          earlyAccessInterested: response.earlyAccessInterested,
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
