import type { SurveyAudience, SurveyDefinition } from './types';
import { RECRUITER_SAAS_INTEREST_SURVEY } from './recruiterSurvey';

/** Registry of all surveys. Add new survey definitions here. */
const SURVEYS: SurveyDefinition[] = [RECRUITER_SAAS_INTEREST_SURVEY];

export function getAllSurveys(): SurveyDefinition[] {
  return SURVEYS;
}

export function getSurveyById(surveyId: string): SurveyDefinition | undefined {
  return SURVEYS.find((survey) => survey.id === surveyId);
}

export function getActiveSurveysForAudience(audience: SurveyAudience): SurveyDefinition[] {
  return SURVEYS.filter((survey) => survey.active && survey.audience === audience);
}

export type { SurveyAudience, SurveyDefinition, SurveyQuestion, SurveyOption } from './types';
