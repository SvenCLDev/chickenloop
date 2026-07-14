export type SurveyAudience = 'recruiter' | 'job-seeker' | 'admin';

export type SurveyQuestionType = 'single_choice' | 'yes_no' | 'free_text';

export interface SurveyOption {
  value: string;
  label: string;
}

export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  label: string;
  required?: boolean;
  options?: SurveyOption[];
  placeholder?: string;
  /** Maps into SurveyResponse fields when submitting */
  mapsTo: 'primaryAnswer' | 'secondaryAnswer' | 'freeText';
}

export interface SurveyDefinition {
  id: string;
  audience: SurveyAudience;
  title: string;
  description: string;
  active: boolean;
  questions: SurveyQuestion[];
}
