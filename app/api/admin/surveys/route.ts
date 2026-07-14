import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { requireRole } from '@/lib/auth';
import SurveyResponse from '@/models/SurveyResponse';
import { getAllSurveys } from '@/lib/surveys';
import { aggregateSurveyResponses } from '@/lib/surveys/aggregate';
import { adminErrorResponse } from '@/lib/marketing/adminErrors';

/**
 * GET — aggregated survey research stats for all registered surveys (admin only).
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);
    await connectDB();

    const surveys = getAllSurveys();
    const surveyIds = surveys.map((s) => s.id);

    const allResponses = await SurveyResponse.find({
      surveyId: { $in: surveyIds },
    })
      .select(
        'surveyId primaryAnswer secondaryAnswer otherText freeText dismissed remindLaterUntil completedAt createdAt'
      )
      .lean();

    const bySurvey = new Map<string, typeof allResponses>();
    for (const response of allResponses) {
      const list = bySurvey.get(response.surveyId) || [];
      list.push(response);
      bySurvey.set(response.surveyId, list);
    }

    const now = new Date();
    const stats = surveys.map((survey) =>
      aggregateSurveyResponses(survey, bySurvey.get(survey.id) || [], now)
    );

    return NextResponse.json({ surveys: stats }, { status: 200 });
  } catch (error: unknown) {
    return adminErrorResponse(error);
  }
}
