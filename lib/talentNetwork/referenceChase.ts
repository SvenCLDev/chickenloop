/**
 * Token-free chase helpers for job seekers.
 *
 * Never include confirm URLs here. Manager emails carry bearer tokens;
 * seekers must not be Cc'd on those messages.
 */

export function buildReferenceChaseSnippet(input: {
  schoolName: string;
  seasonLabel?: string;
  managerName?: string;
}): string {
  const period = input.seasonLabel?.trim()
    ? ` (${input.seasonLabel.trim()})`
    : '';
  const name = input.managerName?.trim();
  const greeting = name ? `Hi ${name},` : 'Hi,';
  return [
    greeting,
    ``,
    `Chickenloop emailed you a short reference request about my season at ${input.schoolName.trim()}${period}.`,
    `It only takes about 10 seconds — thanks so much!`,
  ].join('\n');
}

export function normalizeEmailForCompare(email: string): string {
  return email.trim().toLowerCase();
}

/** True if referenceEmail matches any of the seeker's own addresses. */
export function isSelfAsReferenceEmail(
  referenceEmail: string | undefined | null,
  seekerEmails: Array<string | undefined | null>
): boolean {
  const ref = referenceEmail ? normalizeEmailForCompare(referenceEmail) : '';
  if (!ref) return false;
  return seekerEmails.some(
    (e) => typeof e === 'string' && e.trim() && normalizeEmailForCompare(e) === ref
  );
}

export const SELF_REFERENCE_EMAIL_ERROR =
  'You cannot use your own email as the manager reference. Enter a past employer or supervisor email instead.';
