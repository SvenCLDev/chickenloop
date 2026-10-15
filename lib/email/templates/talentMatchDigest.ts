export function talentMatchDigestEmail({
  recruiterName,
  jobTitle,
  matchCount,
  matchUrl,
  dashboardUrl,
}: {
  recruiterName?: string;
  jobTitle: string;
  matchCount: number;
  matchUrl: string;
  dashboardUrl: string;
}) {
  const greeting = recruiterName || 'there';
  const safeTitle = jobTitle.trim() || 'your role';
  const candidatesLabel = matchCount === 1 ? 'candidate' : 'candidates';

  const subject = `${matchCount} ${candidatesLabel} match your ${safeTitle} role`;

  const html = `
      <p>Hi ${greeting},</p>

      <p>
        Good news — <strong>${matchCount}</strong> people in the Chickenloop talent database
        currently match your job <strong>${safeTitle}</strong>.
      </p>

      <p>
        These profiles are filtered by sport, work area, languages, country, and availability
        (looking for work now, soon, or seasonally).
      </p>

      <p style="margin: 28px 0;">
        <a href="${matchUrl}"
           style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: 600;">
          View matching talent
        </a>
      </p>

      <p>
        You can also review matches for all your jobs on your
        <a href="${dashboardUrl}">recruiter dashboard</a>.
      </p>

      <p>
        Best regards,<br/>
        The Chickenloop team
      </p>
    `;

  const text = `Hi ${greeting},

Good news — ${matchCount} people in the Chickenloop talent database currently match your job "${safeTitle}".

These profiles are filtered by sport, work area, languages, country, and availability (looking for work now, soon, or seasonally).

View matching talent: ${matchUrl}

Review matches on your recruiter dashboard: ${dashboardUrl}

Best regards,
The Chickenloop team
`;

  return { subject, html, text };
}
