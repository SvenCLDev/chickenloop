import { OFFERED_ACTIVITIES_LIST } from '@/lib/offeredActivities';
import { getAllQualifications } from '@/lib/qualifications';
import { OFFICIAL_LANGUAGES } from '@/lib/languages';
import { JOB_CATEGORY_VALUES } from '@/lib/jobCategories';
import { EXPERIENCE_LEVELS } from '@/models/Job';
import { getCountryCodeFromName, getCountryNameFromCode } from '@/lib/countryUtils';

const OCCUPATIONAL_SET = new Set<string>(JOB_CATEGORY_VALUES);
const SPORTS_SET = new Set<string>(OFFERED_ACTIVITIES_LIST);
const LANGUAGE_SET = new Set<string>(OFFICIAL_LANGUAGES);
const QUALIFICATION_SET = new Set<string>(getAllQualifications());
const SCHEMA_EXPERIENCE_SET = new Set<string>(EXPERIENCE_LEVELS);

/** Model output uses broad tiers; map to Job schema levels for the form. */
const AI_EXPERIENCE_TIER_TO_SCHEMA: Record<string, (typeof EXPERIENCE_LEVELS)[number]> = {
  beginner: 'junior',
  intermediate: 'senior',
  advanced: 'expert',
};

/** Allowed AI employment labels before mapping to form `type` values. */
const AI_EMPLOYMENT_VALUES = new Set(['full-time', 'part-time', 'seasonal', 'contract']);

export type SanitizedJobParse = {
  employmentType: string | null;
  experienceLevel: string[];
  languages: string[];
  sports: string[];
  qualifications: string[];
  occupationalAreas: string[];
  /** Salary text when reliably extracted (contains numeric amount), else null */
  salary: string | null;
  /** City or town; trimmed, or null if missing / invalid */
  city: string | null;
  /**
   * Canonical English country name from `CODE_TO_NAME` when the model output
   * resolves via `getCountryCodeFromName`; otherwise null.
   */
  country: string | null;
};

function normHyphenEmployment(s: string): string {
  return s.trim().toLowerCase().replace(/_/g, '-');
}

/** Maps AI employment to form select: full-time | part-time | contract | freelance. Seasonal → part-time. */
export function mapAiEmploymentToFormType(value: unknown): string | null {
  if (value == null || typeof value !== 'string') return null;
  const v = normHyphenEmployment(value);
  if (!AI_EMPLOYMENT_VALUES.has(v)) return null;
  if (v === 'seasonal') return 'part-time';
  return v;
}

function mapExperienceToSchema(value: unknown): string[] {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw == null || typeof raw !== 'string' || !raw.trim()) return [];
  const s = raw.trim();
  if (SCHEMA_EXPERIENCE_SET.has(s)) return [s];
  const mapped = AI_EXPERIENCE_TIER_TO_SCHEMA[s.toLowerCase()];
  return mapped ? [mapped] : [];
}

const MAX_CITY_LEN = 200;
const MAX_SALARY_LEN = 120;

/** Trim and normalize city text; empty or invalid → null */
export function sanitizeParsedCity(value: unknown): string | null {
  if (value == null || typeof value !== 'string') return null;
  const t = value.trim().replace(/\s+/g, ' ');
  if (!t) return null;
  if (t.length > MAX_CITY_LEN) return t.slice(0, MAX_CITY_LEN);
  return t;
}

/**
 * Resolve country to the same canonical English name the form expects (matches
 * `CODE_TO_NAME` via ISO lookup). Unknown / unresolvable → null.
 */
export function sanitizeParsedCountryEnglish(value: unknown): string | null {
  if (value == null || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const code = getCountryCodeFromName(trimmed);
  if (!code) return null;
  const english = getCountryNameFromCode(code);
  return english || null;
}

/**
 * Keep salary only when there is concrete numeric compensation information.
 * Non-numeric labels like "competitive" or "DOE" are treated as unknown.
 */
export function sanitizeParsedSalary(value: unknown): string | null {
  if (value == null || typeof value !== 'string') return null;
  const t = value.trim().replace(/\s+/g, ' ');
  if (!t) return null;
  if (!/\d/.test(t)) return null;
  return t.length > MAX_SALARY_LEN ? t.slice(0, MAX_SALARY_LEN) : t;
}

function uniqAllowed<T extends string>(values: unknown, allowed: Set<string>): T[] {
  if (!Array.isArray(values)) return [];
  const out: T[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    if (typeof v !== 'string') continue;
    const t = v.trim();
    if (!t || !allowed.has(t) || seen.has(t)) continue;
    seen.add(t);
    out.push(t as T);
  }
  return out;
}

/**
 * Validates model output and maps experience / employment to form + schema-safe values.
 * Unknown or invalid entries are dropped; arrays may be empty.
 */
export function sanitizeParsedJobOutput(raw: unknown): SanitizedJobParse {
  const obj =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const employmentType = mapAiEmploymentToFormType(obj.employmentType);

  const occupationalRaw = obj.occupationalAreas;
  const occArray = Array.isArray(occupationalRaw)
    ? occupationalRaw
    : occupationalRaw != null && typeof occupationalRaw === 'string'
      ? [occupationalRaw]
      : [];
  const occupationalAreas = uniqAllowed<string>(occArray, OCCUPATIONAL_SET).slice(0, 1);

  return {
    employmentType,
    experienceLevel: mapExperienceToSchema(obj.experienceLevel),
    languages: uniqAllowed(obj.languages, LANGUAGE_SET),
    sports: uniqAllowed(obj.sports, SPORTS_SET),
    qualifications: uniqAllowed(obj.qualifications, QUALIFICATION_SET),
    occupationalAreas,
    salary: sanitizeParsedSalary(obj.salary),
    city: sanitizeParsedCity(obj.city),
    country: sanitizeParsedCountryEnglish(obj.country),
  };
}
