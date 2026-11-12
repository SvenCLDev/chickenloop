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

  const subject = `${matchCount} potential candidates match your job: ${safeTitle}`;

  const html = `
      <p>Hi ${greeting},</p>

      <p>
        Good news! We found <strong>${matchCount}</strong> potential candidates in the Chickenloop Talent Network
        who match your job posting: <strong>${safeTitle}</strong>
      </p>

      <p>
        These candidates match your requirements based on their sports, professional experience,
        languages, location and availability.
      </p>

      <p>
        Why wait for applications when you can proactively discover and contact suitable instructors?
      </p>

      <p>
        Explore your matching candidates and connect with potential hires directly.
      </p>

      <p style="margin: 28px 0;">
        <a href="${matchUrl}"
           style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: 600;">
          View matching talent
        </a>
      </p>

      <p>
        You can also manage your job postings and recruitment activity from your
        <a href="${dashboardUrl}">recruiter dashboard</a>.
      </p>

      <p>
        Best regards,<br/>
        Sven from The Chickenloop Team
      </p>

      <p>
        Chickenloop – Connecting watersports professionals with opportunities worldwide.
      </p>
    `;

  const text = `Hi ${greeting},

Good news! We found ${matchCount} potential candidates in the Chickenloop Talent Network who match your job posting: ${safeTitle}

These candidates match your requirements based on their sports, professional experience, languages, location and availability.

Why wait for applications when you can proactively discover and contact suitable instructors?

Explore your matching candidates and connect with potential hires directly. View matching talent: ${matchUrl}

You can also manage your job postings and recruitment activity from your recruiter dashboard: ${dashboardUrl}

Best regards,
Sven from The Chickenloop Team

Chickenloop – Connecting watersports professionals with opportunities worldwide.
`;

  return { subject, html, text };
}
