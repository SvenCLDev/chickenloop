import {
  ISSUING_BODIES,
  LANGUAGE_PROFICIENCIES,
  WATERSPORT_DISCIPLINES,
  WORK_AUTHORIZATION_STATUSES,
  type WorkAuthorizationStatus,
} from './types';

export const ISSUING_BODY_LABELS: Record<(typeof ISSUING_BODIES)[number], string> = {
  IKO: 'IKO',
  VDWS: 'VDWS',
  RYA: 'RYA',
  VDWS_WWS: 'VDWS/WWS',
  SSI: 'SSI',
  PADI: 'PADI',
  PASA: 'PASA',
  BKSA: 'BKSA',
  OTHER: 'Other',
};

export const PROFICIENCY_LABELS: Record<(typeof LANGUAGE_PROFICIENCIES)[number], string> = {
  native: 'Native / Bilingual',
  professional: 'Professional Working',
  conversational: 'Conversational / Teaching-ready',
  basic: 'Basic',
};

export const DISCIPLINE_OPTIONS = [...WATERSPORT_DISCIPLINES];

export const ISSUING_BODY_OPTIONS = ISSUING_BODIES.map((value) => ({
  value,
  label: ISSUING_BODY_LABELS[value],
}));

export const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export const WORK_AUTHORIZATION_STATUS_LABELS: Record<WorkAuthorizationStatus, string> = {
  citizen: 'Citizen',
  permanent_resident: 'Permanent resident',
  eu_eea_right: 'EU / EEA right to work',
  valid_work_visa: 'Valid work visa',
  working_holiday: 'Working holiday visa',
  seasonal_permit: 'Seasonal work permit',
  requires_sponsorship: 'Requires visa sponsorship',
};

export const WORK_AUTHORIZATION_STATUS_OPTIONS = WORK_AUTHORIZATION_STATUSES.map((value) => ({
  value,
  label: WORK_AUTHORIZATION_STATUS_LABELS[value],
}));

export const CERTIFICATE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const CERTIFICATE_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;
