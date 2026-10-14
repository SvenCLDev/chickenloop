import { getMarketingSiteUrl } from '@/lib/baseUrlForReferenceEmails';

export function referenceVerificationEmail(input: {
  candidateName: string;
  schoolName: string;
  seasonLabel?: string;
  managerName?: string;
  /** Optional short personal note from the candidate (no URLs required). */
  seekerNote?: string;
  confirmWorkedRehireUrl: string;
  confirmWorkedNoRehireUrl: string;
  confirmNotWorkedUrl: string;
  confirmPageUrl?: string;
}): { subject: string; html: string; text: string } {
  const period = input.seasonLabel ? ` during ${input.seasonLabel}` : '';
  const subject = `${input.candidateName} asked you to confirm their season at ${input.schoolName}`;
  const greeting = input.managerName?.trim()
    ? `Hi ${input.managerName.trim()},`
    : 'Hello,';

  const siteUrl = getMarketingSiteUrl();
  const postJobUrl = `${siteUrl}/register`;
  const browseTalentUrl = `${siteUrl}/talent`;
  const viewJobsUrl = `${siteUrl}/jobs`;
  const note = input.seekerNote?.trim();

  const text = [
    greeting,
    ``,
    `${input.candidateName} listed you as a reference for their work at ${input.schoolName}${period} on Chickenloop.`,
    ...(note ? [``, `A note from ${input.candidateName}:`, `"${note}"`] : []),
    ``,
    `Can you confirm they worked at ${input.schoolName}${period}?`,
    ``,
    `Yes — confirm they worked here (opens a short follow-up about rehire): ${input.confirmPageUrl || input.confirmWorkedRehireUrl}`,
    `Quick answers:`,
    `• Worked here — would rehire: ${input.confirmWorkedRehireUrl}`,
    `• Worked here — would not rehire: ${input.confirmWorkedNoRehireUrl}`,
    `• Did not work at our center: ${input.confirmNotWorkedUrl}`,
    ``,
    `This link expires in 21 days.`,
    ``,
    `---`,
    `Chickenloop is the watersports job board where instructors and centres connect.`,
    `Post a job: ${postJobUrl} · Browse talent: ${browseTalentUrl} · View jobs: ${viewJobsUrl}`,
  ].join('\n');

  const html = `
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
      ${input.candidateName} asked you to confirm their season — takes about 10 seconds.
    </div>
    <p>${greeting}</p>
    <p><strong>${input.candidateName}</strong> listed you as a reference for their work at <strong>${input.schoolName}</strong>${period} on Chickenloop.</p>
    ${
      note
        ? `<blockquote style="margin:16px 0;padding:12px 16px;border-left:4px solid #93c5fd;background:#eff6ff;color:#1e3a8a;font-size:14px;line-height:1.5;">
            <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#1d4ed8;">A note from ${input.candidateName}</p>
            <p style="margin:0;">${note
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')}</p>
          </blockquote>`
        : ''
    }
    <p style="font-size:16px;"><strong>Can you confirm they worked at ${input.schoolName}${period}?</strong></p>
    <p>
      <a href="${input.confirmWorkedRehireUrl}" style="display:inline-block;padding:12px 18px;background:#059669;color:#fff;text-decoration:none;border-radius:6px;margin:0 8px 8px 0;font-weight:600;">Yes — they worked here</a>
    </p>
    <p style="font-size:13px;color:#4b5563;margin-top:8px;">
      Prefer a specific answer?
      <a href="${input.confirmWorkedRehireUrl}" style="color:#2563eb;">Would rehire</a>
      ·
      <a href="${input.confirmWorkedNoRehireUrl}" style="color:#2563eb;">Would not rehire</a>
      ·
      <a href="${input.confirmNotWorkedUrl}" style="color:#b91c1c;">They did not work here</a>
    </p>
    ${
      input.confirmPageUrl
        ? `<p style="font-size:13px;color:#6b7280;"><a href="${input.confirmPageUrl}" style="color:#2563eb;">Open reference form</a> if you prefer to respond on the website.</p>`
        : ''
    }
    <p style="color:#6b7280;font-size:12px;">This link expires in 21 days.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 16px;" />
    <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
      Chickenloop helps watersports centres and instructors connect.
      <a href="${postJobUrl}" style="color:#6b7280;">Post a job</a>
      ·
      <a href="${browseTalentUrl}" style="color:#6b7280;">Browse talent</a>
      ·
      <a href="${viewJobsUrl}" style="color:#6b7280;">View jobs</a>
    </p>
  `;

  return { subject, html, text };
}
