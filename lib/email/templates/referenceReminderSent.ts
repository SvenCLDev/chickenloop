export function referenceReminderSentEmail(input: {
  jobSeekerName?: string;
  schoolName: string;
  seasonLabel?: string;
  managerEmail: string;
  profileUrl: string;
}): { subject: string; html: string; text: string } {
  const greeting = input.jobSeekerName?.trim()
    ? `Hi ${input.jobSeekerName.trim()},`
    : 'Hi,';
  const period = input.seasonLabel ? ` (${input.seasonLabel})` : '';
  const subject = `We reminded your manager about ${input.schoolName}`;

  const text = [
    greeting,
    ``,
    `We sent a reminder to ${input.managerEmail} asking them to confirm your work at ${input.schoolName}${period}.`,
    ``,
    `You can wait for their reply, change the manager email on your profile if you have a better contact, or cancel the request.`,
    ``,
    `Manage this reference: ${input.profileUrl}`,
    ``,
    `— Chickenloop`,
  ].join('\n');

  const html = `
    <p>${greeting}</p>
    <p>
      We sent a reminder to <strong>${input.managerEmail}</strong> asking them to confirm your work at
      <strong>${input.schoolName}</strong>${period}.
    </p>
    <p>
      You can wait for their reply, change the manager email on your profile if you have a better contact,
      or cancel the request.
    </p>
    <p>
      <a href="${input.profileUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">
        Manage this reference
      </a>
    </p>
    <p style="color:#6b7280;font-size:12px;">— Chickenloop</p>
  `;

  return { subject, html, text };
}
