import type { SurveyDefinition } from './types';

/**
 * First product-research survey for recruiters.
 * Add future surveys as separate files and register them in index.ts.
 */
export const RECRUITER_SAAS_INTEREST_SURVEY: SurveyDefinition = {
  id: 'recruiter-saas-interest-2026',
  audience: 'recruiter',
  title: 'Help us build the right tools for you',
  description:
    'We’re exploring new products for watersports schools and recruiters. This takes under a minute — your answers shape what we build next.',
  active: true,
  questions: [
    {
      id: 'primary-need',
      type: 'single_choice',
      label: 'Which tool would help your business the most right now?',
      required: true,
      mapsTo: 'primaryAnswer',
      options: [
        { value: 'equipment_tracking', label: 'Equipment tracking & fleet management' },
        { value: 'staff_scheduling', label: 'Instructor / staff scheduling' },
        { value: 'applicant_pipeline', label: 'Better applicant tracking (ATS)' },
        { value: 'booking_payments', label: 'Lesson booking & payments' },
        { value: 'none', label: 'None of these — I’m fine for now' },
      ],
    },
    {
      id: 'early-access',
      type: 'yes_no',
      label: 'Would you like early access if we build something in this area?',
      required: true,
      mapsTo: 'secondaryAnswer',
      options: [
        { value: 'yes', label: 'Yes, keep me in the loop' },
        { value: 'no', label: 'No thanks' },
      ],
    },
    {
      id: 'free-text',
      type: 'free_text',
      label: 'Anything else you’d like us to know? (optional)',
      required: false,
      mapsTo: 'freeText',
      placeholder: 'e.g. biggest daily pain point, tools you already use…',
    },
  ],
};
