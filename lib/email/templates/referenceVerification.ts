import { getMarketingSiteUrl } from '@/lib/baseUrlForReferenceEmails';

export function referenceVerificationEmail(input: {
  candidateName: string;
  schoolName: string;
  seasonLabel?: string;
  managerName?: string;
  confirmWorkedRehireUrl: string;
  confirmWorkedNoRehireUrl: string;
  confirmNotWorkedUrl: string;
  confirmPageUrl?: string;
}): { subject: string; html: string; text: string } {
  const period = input.seasonLabel ? ` during ${input.seasonLabel}` : '';
  const confirmQuestion = `Can you please confirm if ${input.candidateName} worked at ${input.schoolName}${period} and, if they did, if you would rehire them?`;
  const subject = `${input.schoolName}: reference request for ${input.candidateName}`;
  const greeting = input.managerName?.trim()
    ? `Hi ${input.managerName.trim()},`
    : 'Hello from Chickenloop,';

  const siteUrl = getMarketingSiteUrl();
  const postJobUrl = `${siteUrl}/register`;
  const browseCandidatesUrl = `${siteUrl}/candidates`;
  const viewJobsUrl = `${siteUrl}/jobs`;

  const text = [
    greeting,
    ``,
    `${input.candidateName} listed you as a reference for their work at ${input.schoolName}${period} on Chickenloop.`,
    ``,
    confirmQuestion,
    ``,
    `Yes, they worked here — I would rehire them: ${input.confirmWorkedRehireUrl}`,
    `Yes, they worked here — I would not rehire them: ${input.confirmWorkedNoRehireUrl}`,
    `No, they did not work at our center: ${input.confirmNotWorkedUrl}`,
    ...(input.confirmPageUrl ? [`Open reference form: ${input.confirmPageUrl}`] : []),
    ``,
    `This link expires in 14 days.`,
    ``,
    `---`,
    `About Chickenloop`,
    `Chickenloop is the watersports job board where instructors and centers connect. If you're hiring for your next season, you can post a job for free or browse verified talent on the site.`,
    ``,
    `Post a job: ${postJobUrl}`,
    `Browse candidates: ${browseCandidatesUrl}`,
    `View open jobs: ${viewJobsUrl}`,
  ].join('\n');

  const html = `
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
      ${input.candidateName} listed you as a reference — one-click confirm takes 10 seconds.
    </div>
    <p>${greeting}</p>
    <p><strong>${input.candidateName}</strong> listed you as a reference for their work at <strong>${input.schoolName}</strong>${period} on Chickenloop.</p>
    <p>${confirmQuestion}</p>
    <p>
      <a href="${input.confirmWorkedRehireUrl}" style="display:inline-block;padding:10px 16px;background:#059669;color:#fff;text-decoration:none;border-radius:6px;margin:0 8px 8px 0;">Yes, they worked here — I would rehire them</a>
      <a href="${input.confirmWorkedNoRehireUrl}" style="display:inline-block;padding:10px 16px;background:#6b7280;color:#fff;text-decoration:none;border-radius:6px;margin:0 8px 8px 0;">Yes, they worked here — I would not rehire them</a>
      <a href="${input.confirmNotWorkedUrl}" style="display:inline-block;padding:10px 16px;background:#fff;color:#b91c1c;border:1px solid #fca5a5;text-decoration:none;border-radius:6px;margin:0 8px 8px 0;">No, they did not work at our center</a>
    </p>
    ${
      input.confirmPageUrl
        ? `<p style="font-size:13px;color:#6b7280;"><a href="${input.confirmPageUrl}" style="color:#2563eb;">Open reference form</a> if you prefer to respond on the website.</p>`
        : ''
    }
    <p style="color:#6b7280;font-size:12px;">This link expires in 14 days.</p>
    <div style="margin-top:24px;padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#374151;">About Chickenloop</p>
      <p style="margin:0 0 12px;font-size:13px;color:#6b7280;line-height:1.5;">
        Chickenloop is the watersports job board where instructors and centers connect.
        If you're hiring for your next season, you can post a job for free or browse verified talent on the site.
      </p>
      <p style="margin:0;font-size:13px;">
        <a href="${postJobUrl}" style="color:#2563eb;text-decoration:none;">Post a job</a>
        <span style="color:#9ca3af;"> · </span>
        <a href="${browseCandidatesUrl}" style="color:#2563eb;text-decoration:none;">Browse candidates</a>
        <span style="color:#9ca3af;"> · </span>
        <a href="${viewJobsUrl}" style="color:#2563eb;text-decoration:none;">View open jobs</a>
      </p>
    </div>
  `;

  return { subject, html, text };
}
