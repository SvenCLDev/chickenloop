import type { SurveyDefinition } from './types';

/**
 * First product-research survey for recruiters.
 * Add future surveys as separate files and register them in index.ts.
 */
export const RECRUITER_SAAS_INTEREST_SURVEY: SurveyDefinition = {
  id: 'recruiter-saas-interest-2026',
  audience: 'recruiter',
  title: 'Help us build better tools for watersports schools',
  description:
    "We'd love your feedback.\n\nThis takes less than 30 seconds and helps us decide what to build next.",
  active: true,
  thankYouTitle: 'Thank you!',
  thankYouMessage: 'Your feedback directly influences what we build next.',
  thankYouEarlyAccessMessage:
    "If you requested early access, we'll contact you before anyone else when we have something ready.",
  questions: [
    {
      id: 'biggest-problem',
      type: 'single_choice',
      label: 'Which of these problems would make the biggest difference to your business if solved?',
      required: true,
      mapsTo: 'primaryAnswer',
      options: [
        {
          value: 'screen_unsuitable_applicants',
          label: 'Spend less time screening unsuitable applicants',
        },
        {
          value: 'hire_instructors_faster',
          label: 'Hire instructors faster before competitors do',
        },
        {
          value: 'retain_staff_pay',
          label: 'Stop overpaying or losing good staff',
        },
        {
          value: 'equipment_maintenance',
          label: 'Keep track of equipment and maintenance',
        },
        {
          value: 'reduce_admin',
          label: 'Reduce paperwork and admin',
        },
        {
          value: 'certifications',
          label: 'Keep instructor certifications organised',
        },
        {
          value: 'accommodation_seasonal_staff',
          label: 'Manage accommodation and seasonal staff more easily',
        },
        {
          value: 'reduce_no_shows',
          label: 'Reduce candidate no-shows',
        },
        {
          value: 'other',
          label: 'Other',
          showOtherText: true,
        },
      ],
    },
    {
      id: 'willingness-to-pay',
      type: 'single_choice',
      label: 'If Chickenloop solved this problem really well...',
      required: true,
      showWhenPrimaryAnswered: true,
      mapsTo: 'secondaryAnswer',
      options: [
        { value: 'definitely_pay', label: "I'd definitely pay for it" },
        { value: 'probably_pay', label: "I'd probably pay for it" },
        { value: 'free_version', label: "I'd use a free version" },
        { value: 'early_access', label: "I'd like early access" },
        { value: 'not_interested', label: 'Not interested' },
      ],
    },
    {
      id: 'current-solution',
      type: 'free_text',
      label: 'How are you solving this today?',
      required: false,
      showWhenPrimaryAnswered: true,
      mapsTo: 'freeText',
      placeholder: 'Excel, WhatsApp, Google Sheets, other software, paper, no real system…',
    },
    {
      id: 'magic-wish',
      type: 'free_text',
      label: 'If Chickenloop could magically remove ONE headache from hiring or running your watersports business, what would it be?',
      required: false,
      showWhenSecondaryAnswered: true,
      headline: 'One last question...',
      mapsTo: 'magicWish',
      maxLength: 1000,
      placeholder: 'Tell us anything that wastes your time, costs money, or causes frustration.',
    },
  ],
  pricingStep: {
    id: 'price-validation-29',
    headline: "Great! We'd love your help building it.",
    body: "We're considering building this as a premium tool for watersports schools.\n\nExpected price:\n\n€29/month",
    priceEur: 29,
    question: 'If this solved your problem really well, would you seriously consider subscribing?',
    showWhenPaymentInterest: ['definitely_pay', 'probably_pay'],
    options: [
      { value: 'likely', label: "Yes, I'd likely subscribe" },
      { value: 'maybe', label: "Maybe, I'd like to see a demo first" },
      { value: 'rejected', label: 'Probably not at that price' },
    ],
    earlyAccess: {
      question: 'Would you like early access?',
      showWhenPriceResponse: ['likely', 'maybe'],
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ],
    },
  },
};
