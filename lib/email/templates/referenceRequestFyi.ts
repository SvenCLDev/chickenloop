import { buildReferenceChaseSnippet } from '@/lib/talentNetwork/referenceChase';

/**
 * Seeker-facing FYI after a manager reference request is sent.
 * Must never include confirm token URLs.
 */
export function referenceRequestFyiEmail(input: {
  jobSeekerName?: string;
  schoolName: string;
  seasonLabel?: string;
  managerEmail: string;
  managerName?: string;
  expiresInDays: number;
  profileUrl: string;
  reason: 'initial' | 'reminder' | 'resend_fyi';
}): { subject: string; html: string; text: string; chaseSnippet: string } {
  const greeting = input.jobSeekerName?.trim()
    ? `Hi ${input.jobSeekerName.trim()},`
    : 'Hi,';
  const period = input.seasonLabel ? ` (${input.seasonLabel})` : '';
  const chaseSnippet = buildReferenceChaseSnippet({
    schoolName: input.schoolName,
    seasonLabel: input.seasonLabel,
    managerName: input.managerName,
  });

  const subject =
    input.reason === 'reminder'
      ? `Reminder sent to ${input.managerEmail} about ${input.schoolName}`
      : `We asked ${input.managerEmail} about your time at ${input.schoolName}`;

  const lead =
    input.reason === 'reminder'
      ? `We sent a reminder to ${input.managerEmail} asking them to confirm your work at ${input.schoolName}${period}.`
      : input.reason === 'resend_fyi'
        ? `Here is another copy of the chase details for your reference request to ${input.managerEmail} about ${input.schoolName}${period}.`
        : `We emailed ${input.managerEmail} asking them to confirm your work at ${input.schoolName}${period}.`;

  const text = [
    greeting,
    ``,
    lead,
    ``,
    `Only they can confirm this — you cannot confirm it yourself.`,
    `The manager link expires in ${input.expiresInDays} days.`,
    ``,
    `You can nudge them on WhatsApp or email with a message like:`,
    ``,
    chaseSnippet,
    ``,
    `(Do not forward any Chickenloop email that contains confirmation buttons — those links are only for your manager.)`,
    ``,
    `Manage this reference: ${input.profileUrl}`,
    ``,
    `— Chickenloop`,
  ].join('\n');

  const html = `
    <p>${greeting}</p>
    <p>${lead}</p>
    <p><strong>Only they can confirm this — you cannot confirm it yourself.</strong>
    The manager link expires in ${input.expiresInDays} days.</p>
    <p>You can nudge them on WhatsApp or email with a message like:</p>
    <pre style="white-space:pre-wrap;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;font-size:13px;color:#374151;">${chaseSnippet
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</pre>
    <p style="font-size:13px;color:#6b7280;">
      Do not forward any Chickenloop email that contains confirmation buttons — those links are only for your manager.
    </p>
    <p>
      <a href="${input.profileUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">
        Manage this reference
      </a>
    </p>
    <p style="color:#6b7280;font-size:12px;">— Chickenloop</p>
  `;

  return { subject, html, text, chaseSnippet };
}
