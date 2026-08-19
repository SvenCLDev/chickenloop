import { getMarketingSiteUrl } from '@/lib/baseUrlForReferenceEmails';

export function referenceVerificationEmail(input: {
  candidateName: string;
  schoolName: string;
  seasonLabel?: string;
  confirmYesUrl: string;
  confirmNoUrl: string;
}): { subject: string; html: string; text: string } {
  const period = input.seasonLabel ? ` during ${input.seasonLabel}` : '';
  const subject = `Reference check: did ${input.candidateName} work at ${input.schoolName}?`;

  const siteUrl = getMarketingSiteUrl();
  const postJobUrl = `${siteUrl}/register`;
  const browseCandidatesUrl = `${siteUrl}/candidates`;
  const viewJobsUrl = `${siteUrl}/jobs`;

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
    <p>Hello,</p>
    <p><strong>${input.candidateName}</strong> listed you as a reference for their work at <strong>${input.schoolName}</strong>${period} on Chickenloop.</p>
    <p>Did they work for your center during this period? Would you rehire them?</p>
    <p>
      <a href="${input.confirmYesUrl}" style="display:inline-block;padding:10px 16px;background:#059669;color:#fff;text-decoration:none;border-radius:6px;margin-right:8px;">Yes, I would rehire them</a>
      <a href="${input.confirmNoUrl}" style="display:inline-block;padding:10px 16px;background:#6b7280;color:#fff;text-decoration:none;border-radius:6px;">No</a>
    </p>
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
