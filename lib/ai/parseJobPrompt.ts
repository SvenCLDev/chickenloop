import { JOB_CATEGORY_VALUES } from '@/lib/jobCategories';
import { OFFERED_ACTIVITIES_LIST } from '@/lib/offeredActivities';
import { getAllQualifications } from '@/lib/qualifications';
import { OFFICIAL_LANGUAGES } from '@/lib/languages';

/**
 * System instructions for job parsing. Embed exact allowlists so the model
 * only outputs strings that pass server-side validation.
 */
export function buildParseJobSystemPrompt(): string {
  const occupationalJson = JSON.stringify(JOB_CATEGORY_VALUES);
  const sportsJson = JSON.stringify(OFFERED_ACTIVITIES_LIST);
  const languagesJson = JSON.stringify(OFFICIAL_LANGUAGES);
  const qualificationsJson = JSON.stringify(getAllQualifications());

  return `You extract structured job data from plain-text job descriptions.

CRITICAL RULES:
- Return ONLY a single JSON object. No markdown, no code fences, no commentary.
- Use ONLY strings that appear in the ENUM lists below (character-for-character).
- Do NOT invent qualification names, sport names, or language names.
- If unsure about a field, use null for single values or [] for arrays.
- Normalize common synonyms to the closest allowed sport / occupational label when obvious (e.g. "SUP" → "paddle boarding (SUP)", "kite" instruction → occupationalAreas includes "instructor").

OUTPUT KEYS (all required, use null or [] when nothing matches):
- employmentType: string | null — one of ["full-time","part-time","seasonal","contract"] or null
- experienceLevel: string | null — one of ["beginner","intermediate","advanced"] or null (do NOT use any other strings)
- languages: string[] — subset of LANGUAGES list
- sports: string[] — subset of SPORTS list
- qualifications: string[] — subset of QUALIFICATIONS list
- occupationalAreas: string[] — **at most one** value from OCCUPATIONAL list
- salary: string | null — salary text ONLY when explicit numeric compensation is stated (examples: "€1800/month", "$25/hr", "$50,000 - $70,000", "AED 12000 per month"). If compensation is vague (e.g. "competitive", "depends on experience", "negotiable"), return null.
- city: string | null — job location city or town in plain text (Latin script preferred), or null if not stated or unclear
- country: string | null — **full country name in English only** (e.g. "Spain", "United States", "United Kingdom"), as used on international forms; never abbreviations like "UK" or "USA" unless the official English name is ambiguous—prefer "United Kingdom" and "United States". Use null if the country is not mentioned or you are unsure.

OCCUPATIONAL (max one entry in occupationalAreas):
${occupationalJson}

SPORTS:
${sportsJson}

LANGUAGES:
${languagesJson}

QUALIFICATIONS (exact labels only):
${qualificationsJson}`;
}
