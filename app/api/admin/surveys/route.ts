import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { requireRole } from '@/lib/auth';
import SurveyResponse from '@/models/SurveyResponse';
import User from '@/models/User';
import Company from '@/models/Company';
import { getAllSurveys } from '@/lib/surveys';
import { aggregateSurveyResponses, type AggregatableSurveyResponse } from '@/lib/surveys/aggregate';
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
        'userId surveyId primaryAnswer secondaryAnswer otherText freeText problemCategory paymentInterest pricePointShown priceResponse priceAccepted earlyAccessInterested magicWish dismissed remindLaterUntil completedAt createdAt'
      )
      .lean();

    const userIds = [
      ...new Set(
        allResponses
          .map((r) => (r.userId ? String(r.userId) : ''))
          .filter(Boolean)
      ),
    ];

    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } })
          .select('name email companyId')
          .lean()
      : [];

    const companyIds = [
      ...new Set(
        users
          .map((u) => (u.companyId ? String(u.companyId) : ''))
          .filter(Boolean)
      ),
    ];

    const companies = companyIds.length
      ? await Company.find({ _id: { $in: companyIds } })
          .select('name')
          .lean()
      : [];

    const companyNameById = new Map(companies.map((c) => [String(c._id), c.name || '']));
    const userById = new Map(
      users.map((u) => [
        String(u._id),
        {
          name: u.name || '',
          email: u.email || '',
          companyName: u.companyId ? companyNameById.get(String(u.companyId)) || '' : '',
        },
      ])
    );

    const enriched: Array<AggregatableSurveyResponse & { surveyId: string }> = allResponses.map(
      (r) => {
        const user = r.userId ? userById.get(String(r.userId)) : undefined;
        return {
          ...r,
          surveyId: r.surveyId,
          recruiterName: user?.name,
          recruiterEmail: user?.email,
          companyName: user?.companyName,
        };
      }
    );

    const bySurvey = new Map<string, typeof enriched>();
    for (const response of enriched) {
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
