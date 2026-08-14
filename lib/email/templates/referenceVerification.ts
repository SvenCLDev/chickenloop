export function referenceVerificationEmail(input: {
  candidateName: string;
  schoolName: string;
  seasonLabel?: string;
  confirmYesUrl: string;
  confirmNoUrl: string;
}): { subject: string; html: string; text: string } {
  const period = input.seasonLabel ? ` during ${input.seasonLabel}` : '';
  const subject = `Reference check: did ${input.candidateName} work at ${input.schoolName}?`;

  const text = [
    `Hello,`,
    ``,
    `${input.candidateName} listed you as a reference for their work at ${input.schoolName}${period} on Chickenloop.`,
    ``,
    `Did they work for your center during this period? Would you rehire them?`,
    ``,
    `Yes, I would rehire them: ${input.confirmYesUrl}`,
    `No: ${input.confirmNoUrl}`,
    ``,
    `This link expires in 14 days.`,
  ].join('\n');

  const html = `
    <p>Hello,</p>
    <p><strong>${input.candidateName}</strong> listed you as a reference for their work at <strong>${input.schoolName}</strong>${period} on Chickenloop.</p>
    <p>Did they work for your center during this period? Would you rehire them?</p>
    <p>
      <a href="${input.confirmYesUrl}" style="display:inline-block;padding:10px 16px;background:#059669;color:#fff;text-decoration:none;border-radius:6px;margin-right:8px;">Yes, I would rehire them</a>
      <a href="${input.confirmNoUrl}" style="display:inline-block;padding:10px 16px;background:#6b7280;color:#fff;text-decoration:none;border-radius:6px;">No</a>
    </p>
    <p style="color:#6b7280;font-size:12px;">This link expires in 14 days.</p>
  `;

  return { subject, html, text };
}
