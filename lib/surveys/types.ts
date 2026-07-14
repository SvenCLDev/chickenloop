export type SurveyAudience = 'recruiter' | 'job-seeker' | 'admin';

export type SurveyQuestionType = 'single_choice' | 'yes_no' | 'free_text';

export interface SurveyOption {
  value: string;
  label: string;
  /** When true, selecting this option reveals an otherText field */
  showOtherText?: boolean;
}

export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  label: string;
  required?: boolean;
  options?: SurveyOption[];
  placeholder?: string;
  /** Show this question only after a primary answer is chosen */
  showWhenPrimaryAnswered?: boolean;
  /** Maps into SurveyResponse fields when submitting */
  mapsTo: 'primaryAnswer' | 'secondaryAnswer' | 'freeText' | 'otherText';
}

export interface SurveyDefinition {
  id: string;
  audience: SurveyAudience;
  title: string;
  description: string;
  active: boolean;
  questions: SurveyQuestion[];
  thankYouTitle?: string;
  thankYouMessage?: string;
}
