import type { SurveyDefinition } from './types';
import type { ISurveyResponse } from '@/models/SurveyResponse';

function countByValue(values: Array<string | null | undefined>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    if (!value) continue;
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

export interface SurveyStats {
  surveyId: string;
  title: string;
  description: string;
  totalResponses: number;
  completedCount: number;
  dismissedCount: number;
  remindLaterCount: number;
  completionRate: number;
  primaryAnswerDistribution: { value: string; label: string; count: number }[];
  secondaryAnswerDistribution: { value: string; label: string; count: number }[];
  earlyAccessInterest: {
    earlyAccess: number;
    wouldPay: number;
    freeOnly: number;
    notInterested: number;
  };
  freeTextResponses: {
    id: string;
    freeText: string;
    otherText: string | null;
    primaryAnswer: string | null;
    secondaryAnswer: string | null;
    completedAt: string | null;
    createdAt: string;
  }[];
  otherTextResponses: {
    id: string;
    otherText: string;
    primaryAnswer: string | null;
    completedAt: string | null;
    createdAt: string;
  }[];
}

export function aggregateSurveyResponses(
  survey: SurveyDefinition,
  responses: Array<
    Pick<
      ISurveyResponse,
      | '_id'
      | 'primaryAnswer'
      | 'secondaryAnswer'
      | 'otherText'
      | 'freeText'
      | 'dismissed'
      | 'remindLaterUntil'
      | 'completedAt'
      | 'createdAt'
    >
  >,
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

  const primaryCounts = countByValue(completed.map((r) => r.primaryAnswer));
  const secondaryCounts = countByValue(completed.map((r) => r.secondaryAnswer));

  const primaryAnswerDistribution = (primaryQuestion?.options || []).map((opt) => ({
    value: opt.value,
    label: opt.label,
    count: primaryCounts[opt.value] || 0,
  }));

  for (const [value, count] of Object.entries(primaryCounts)) {
    if (!primaryAnswerDistribution.some((row) => row.value === value)) {
      primaryAnswerDistribution.push({ value, label: value, count });
    }
  }

  const secondaryAnswerDistribution = (secondaryQuestion?.options || []).map((opt) => ({
    value: opt.value,
    label: opt.label,
    count: secondaryCounts[opt.value] || 0,
  }));

  for (const [value, count] of Object.entries(secondaryCounts)) {
    if (!secondaryAnswerDistribution.some((row) => row.value === value)) {
      secondaryAnswerDistribution.push({ value, label: value, count });
    }
  }

  const earlyAccessInterest = {
    earlyAccess: secondaryCounts.early_access || 0,
    wouldPay: (secondaryCounts.definitely_pay || 0) + (secondaryCounts.probably_pay || 0),
    freeOnly: secondaryCounts.free_version || 0,
    notInterested: secondaryCounts.not_interested || 0,
  };

  const freeTextResponses = completed
    .filter((r) => r.freeText && String(r.freeText).trim())
    .map((r) => ({
      id: String(r._id),
      freeText: String(r.freeText).trim(),
      otherText: r.otherText ? String(r.otherText).trim() : null,
      primaryAnswer: r.primaryAnswer ?? null,
      secondaryAnswer: r.secondaryAnswer ?? null,
      completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
      createdAt: new Date(r.createdAt).toISOString(),
    }))
    .sort((a, b) => (b.completedAt || b.createdAt).localeCompare(a.completedAt || a.createdAt));

  const otherTextResponses = completed
    .filter((r) => r.otherText && String(r.otherText).trim())
    .map((r) => ({
      id: String(r._id),
      otherText: String(r.otherText).trim(),
      primaryAnswer: r.primaryAnswer ?? null,
      completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
      createdAt: new Date(r.createdAt).toISOString(),
    }))
    .sort((a, b) => (b.completedAt || b.createdAt).localeCompare(a.completedAt || a.createdAt));

  const totalResponses = responses.length;
  const completedCount = completed.length;
  const completionRate =
    totalResponses === 0 ? 0 : Math.round((completedCount / totalResponses) * 1000) / 10;

  return {
    surveyId: survey.id,
    title: survey.title,
    description: survey.description,
    totalResponses,
    completedCount,
    dismissedCount: dismissed.length,
    remindLaterCount: remindLater.length,
    completionRate,
    primaryAnswerDistribution,
    secondaryAnswerDistribution,
    earlyAccessInterest,
    freeTextResponses,
    otherTextResponses,
  };
}
