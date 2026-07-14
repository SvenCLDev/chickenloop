import type { SurveyDefinition } from './types';
import type {
  ISurveyResponse,
  SurveyPaymentInterest,
  SurveyPriceResponse,
} from '@/models/SurveyResponse';

export interface ProblemRankingRow {
  problemValue: string;
  problemLabel: string;
  responses: number;
  definitelyPay: number;
  probablyPay: number;
  earlyAccess: number;
  acceptanceRate: number;
}

export interface PricingValidationStats {
  pricePoint: number;
  numberShown: number;
  likelyToSubscribe: number;
  maybe: number;
  rejectedPrice: number;
  conversionPercent: number;
}

export interface EarlyAccessLead {
  id: string;
  company: string;
  recruiter: string;
  email: string;
  problem: string;
  problemLabel: string;
  likelyToSubscribe: boolean;
  earlyAccess: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface MagicWishRow {
  id: string;
  magicWish: string;
  problemCategory: string | null;
  problemLabel: string;
  company: string;
  recruiter: string;
  email: string;
  completedAt: string | null;
  createdAt: string;
}

export interface SurveySummaryCards {
  recruitersSurveyed: number;
  completionRate: number;
  definitelyPayPercent: number;
  probablyPayPercent: number;
  priceAcceptancePercent: number;
  earlyAccessSignups: number;
}

export interface SurveyStats {
  surveyId: string;
  title: string;
  description: string;
  summary: SurveySummaryCards;
  problemRanking: ProblemRankingRow[];
  pricingValidation: PricingValidationStats;
  earlyAccessList: EarlyAccessLead[];
  magicWishResponses: MagicWishRow[];
  // retained for lighter displays
  totalResponses: number;
  completedCount: number;
  dismissedCount: number;
  remindLaterCount: number;
  completionRate: number;
  primaryAnswerDistribution: { value: string; label: string; count: number }[];
  secondaryAnswerDistribution: { value: string; label: string; count: number }[];
}

type LeanResponse = {
  _id: { toString(): string };
  userId?: { toString(): string } | string;
  primaryAnswer?: string | null;
  secondaryAnswer?: string | null;
  otherText?: string | null;
  freeText?: string | null;
  problemCategory?: string | null;
  paymentInterest?: SurveyPaymentInterest | null;
  pricePointShown?: number | null;
  priceResponse?: SurveyPriceResponse | null;
  priceAccepted?: boolean | null;
  earlyAccessInterested?: boolean | null;
  magicWish?: string | null;
  dismissed?: boolean;
  remindLaterUntil?: Date | string | null;
  completedAt?: Date | string | null;
  createdAt: Date | string;
  recruiterName?: string;
  recruiterEmail?: string;
  companyName?: string;
};

function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function normalizePaymentInterest(
  response: LeanResponse
): SurveyPaymentInterest | null {
  if (response.paymentInterest) return response.paymentInterest;
  const secondary = response.secondaryAnswer;
  if (secondary === 'definitely_pay') return 'definitely';
  if (secondary === 'probably_pay') return 'probably';
  if (secondary === 'free_version') return 'free';
  if (secondary === 'early_access') return 'early_access';
  if (secondary === 'not_interested') return 'not_interested';
  return null;
}

function normalizeProblem(response: LeanResponse): string | null {
  return response.problemCategory || response.primaryAnswer || null;
}

export function aggregateSurveyResponses(
  survey: SurveyDefinition,
  responses: LeanResponse[],
  now: Date = new Date()
): SurveyStats {
  const completed = responses.filter((r) => !!r.completedAt);
  const dismissed = responses.filter((r) => r.dismissed);
  const remindLater = responses.filter(
    (r) =>
      !r.dismissed &&
      !r.completedAt &&
      r.remindLaterUntil &&
      new Date(r.remindLaterUntil).getTime() > now.getTime()
  );

  const primaryQuestion = survey.questions.find((q) => q.mapsTo === 'primaryAnswer');
  const secondaryQuestion = survey.questions.find((q) => q.mapsTo === 'secondaryAnswer');
  const pricePoint = survey.pricingStep?.priceEur ?? 29;

  const labelByProblem = new Map(
    (primaryQuestion?.options || []).map((o) => [o.value, o.label])
  );

  const problemRanking: ProblemRankingRow[] = (primaryQuestion?.options || []).map((opt) => {
    const rows = completed.filter((r) => normalizeProblem(r) === opt.value);
    const definitelyPay = rows.filter((r) => normalizePaymentInterest(r) === 'definitely').length;
    const probablyPay = rows.filter((r) => normalizePaymentInterest(r) === 'probably').length;
    const earlyAccess = rows.filter(
      (r) =>
        r.earlyAccessInterested === true || normalizePaymentInterest(r) === 'early_access'
    ).length;
    return {
      problemValue: opt.value,
      problemLabel: opt.label,
      responses: rows.length,
      definitelyPay,
      probablyPay,
      earlyAccess,
      acceptanceRate: percent(definitelyPay + probablyPay, rows.length),
    };
  }).sort((a, b) => b.responses - a.responses);

  const shownPrice = completed.filter((r) => r.pricePointShown === pricePoint || r.priceResponse);
  const likelyToSubscribe = shownPrice.filter((r) => r.priceResponse === 'likely').length;
  const maybe = shownPrice.filter((r) => r.priceResponse === 'maybe').length;
  const rejectedPrice = shownPrice.filter((r) => r.priceResponse === 'rejected').length;
  const pricingValidation: PricingValidationStats = {
    pricePoint,
    numberShown: shownPrice.length,
    likelyToSubscribe,
    maybe,
    rejectedPrice,
    conversionPercent: percent(likelyToSubscribe + maybe, shownPrice.length),
  };

  const earlyAccessList: EarlyAccessLead[] = completed
    .filter((r) => r.earlyAccessInterested === true)
    .map((r) => {
      const problem = normalizeProblem(r);
      return {
        id: String(r._id),
        company: r.companyName || '—',
        recruiter: r.recruiterName || '—',
        email: r.recruiterEmail || '—',
        problem: problem || '—',
        problemLabel: (problem && labelByProblem.get(problem)) || problem || '—',
        likelyToSubscribe: r.priceResponse === 'likely',
        earlyAccess: true,
        completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
        createdAt: new Date(r.createdAt).toISOString(),
      };
    })
    .sort((a, b) => (b.completedAt || b.createdAt).localeCompare(a.completedAt || a.createdAt));

  const magicWishResponses: MagicWishRow[] = completed
    .filter((r) => r.magicWish && String(r.magicWish).trim())
    .map((r) => {
      const problem = normalizeProblem(r);
      return {
        id: String(r._id),
        magicWish: String(r.magicWish).trim(),
        problemCategory: problem,
        problemLabel: (problem && labelByProblem.get(problem)) || problem || '—',
        company: r.companyName || '—',
        recruiter: r.recruiterName || '—',
        email: r.recruiterEmail || '—',
        completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
        createdAt: new Date(r.createdAt).toISOString(),
      };
    })
    .sort((a, b) => (b.completedAt || b.createdAt).localeCompare(a.completedAt || a.createdAt));

  const completedCount = completed.length;
  const totalResponses = responses.length;
  const definitelyCount = completed.filter((r) => normalizePaymentInterest(r) === 'definitely').length;
  const probablyCount = completed.filter((r) => normalizePaymentInterest(r) === 'probably').length;
  const earlyAccessSignups = completed.filter((r) => r.earlyAccessInterested === true).length;

  const summary: SurveySummaryCards = {
    recruitersSurveyed: totalResponses,
    completionRate: percent(completedCount, totalResponses),
    definitelyPayPercent: percent(definitelyCount, completedCount),
    probablyPayPercent: percent(probablyCount, completedCount),
    priceAcceptancePercent: pricingValidation.conversionPercent,
    earlyAccessSignups,
  };

  const primaryCounts = new Map<string, number>();
  const secondaryCounts = new Map<string, number>();
  for (const r of completed) {
    const p = normalizeProblem(r);
    if (p) primaryCounts.set(p, (primaryCounts.get(p) || 0) + 1);
    if (r.secondaryAnswer) {
      secondaryCounts.set(r.secondaryAnswer, (secondaryCounts.get(r.secondaryAnswer) || 0) + 1);
    }
  }

  return {
    surveyId: survey.id,
    title: survey.title,
    description: survey.description,
    summary,
    problemRanking,
    pricingValidation,
    earlyAccessList,
    magicWishResponses,
    totalResponses,
    completedCount,
    dismissedCount: dismissed.length,
    remindLaterCount: remindLater.length,
    completionRate: summary.completionRate,
    primaryAnswerDistribution: (primaryQuestion?.options || []).map((opt) => ({
      value: opt.value,
      label: opt.label,
      count: primaryCounts.get(opt.value) || 0,
    })),
    secondaryAnswerDistribution: (secondaryQuestion?.options || []).map((opt) => ({
      value: opt.value,
      label: opt.label,
      count: secondaryCounts.get(opt.value) || 0,
    })),
  };
}

export type { LeanResponse as AggregatableSurveyResponse };
