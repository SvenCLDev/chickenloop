export function referenceEmailBouncedEmail(input: {
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
  const subject = `Could not deliver your reference email for ${input.schoolName}`;

  const text = [
    greeting,
    ``,
    `We tried to email your manager reference at ${input.managerEmail} to confirm your work at ${input.schoolName}${period}, but the message could not be delivered.`,
    ``,
    `Please open your Chickenloop profile, enter a different manager email for that experience, and save again so we can send a new verification request.`,
    ``,
    `Update your profile: ${input.profileUrl}`,
    ``,
    `— Chickenloop`,
  ].join('\n');

  const html = `
    <p>${greeting}</p>
    <p>
      We tried to email your manager reference at
      <strong>${input.managerEmail}</strong>
      to confirm your work at <strong>${input.schoolName}</strong>${period},
      but the message could not be delivered.
    </p>
    <p>
      Please open your Chickenloop profile, enter a <strong>different manager email</strong>
      for that experience, and save again so we can send a new verification request.
    </p>
    <p>
      <a href="${input.profileUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">
        Update your profile
      </a>
    </p>
    <p style="color:#6b7280;font-size:12px;">— Chickenloop</p>
  `;

  return { subject, html, text };
}
