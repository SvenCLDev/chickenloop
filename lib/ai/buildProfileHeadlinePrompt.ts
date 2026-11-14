import type { ProfileHeadlineInput } from '@/lib/talentNetwork/profileHeadline';

export function buildProfileHeadlineSystemPrompt(): string {
  return `You write a single professional headline for a watersports talent profile on Chickenloop.

Rules:
- Return ONLY the headline text. No quotes, no explanation, no alternatives.
- Aim for about 35–45 characters; never exceed 80 characters.
- Describe professional identity: roles + main sports (e.g. "Kitesurf & Wingfoil Instructor").
- Use at most two sports/disciplines and at most two role ideas.
- Prefer natural recruiter-friendly wording.
- Do NOT invent roles, certifications, seniority, or experience.
- Do NOT include the person's name, location, languages, or availability.
- Do NOT use marketing fluff ("world-class", "passionate", "experienced professional" alone).
- Work areas like "Instruction" map to Instructor; "Management" to Manager / Centre Manager when appropriate.
- Certifications may inform phrasing (e.g. Examiner) only when the data clearly supports it.
- If data is thin, use a short fallback like "Watersports Professional" or "Watersports Instructor".`;
}

export function buildProfileHeadlineUserPrompt(input: ProfileHeadlineInput): string {
  return `Create one headline from this structured profile JSON:\n${JSON.stringify(input, null, 2)}`;
}
