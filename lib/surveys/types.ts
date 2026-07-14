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
  /** Show this question only after a secondary (payment interest) answer is chosen */
  showWhenSecondaryAnswered?: boolean;
  /** Optional section headline above the question */
  headline?: string;
  /** Maps into SurveyResponse fields when submitting */
  mapsTo: 'primaryAnswer' | 'secondaryAnswer' | 'freeText' | 'otherText' | 'magicWish';
  maxLength?: number;
}

export interface SurveyPricingStep {
  id: string;
  headline: string;
  body: string;
  priceEur: number;
  question: string;
  /** Secondary answers that unlock this pricing step */
  showWhenPaymentInterest: string[];
  options: SurveyOption[];
  earlyAccess: {
    question: string;
    /** priceResponse values that unlock early-access question */
    showWhenPriceResponse: string[];
    options: SurveyOption[];
  };
}

export interface SurveyDefinition {
  id: string;
  audience: SurveyAudience;
  title: string;
  description: string;
  active: boolean;
  questions: SurveyQuestion[];
  pricingStep?: SurveyPricingStep;
  thankYouTitle?: string;
  thankYouMessage?: string;
  thankYouEarlyAccessMessage?: string;
}

/** Map Q2 option values → stored paymentInterest */
export const PAYMENT_INTEREST_BY_SECONDARY: Record<string, string> = {
  definitely_pay: 'definitely',
  probably_pay: 'probably',
  free_version: 'free',
  early_access: 'early_access',
  not_interested: 'not_interested',
};

export const SECONDARY_BY_PAYMENT_INTEREST: Record<string, string> = {
  definitely: 'definitely_pay',
  probably: 'probably_pay',
  free: 'free_version',
  early_access: 'early_access',
  not_interested: 'not_interested',
};
