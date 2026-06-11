export function jobPostedConfirmationEmail({
  recruiterName,
  jobTitle,
  jobUrl,
  dashboardUrl,
}: {
  recruiterName?: string;
  jobTitle: string;
  jobUrl: string;
  dashboardUrl: string;
}) {
  const greeting = recruiterName || 'there';

  const html = `
      <p>Hi ${greeting},</p>

      <p>
        Your job posting <strong>${jobTitle}</strong> has been published successfully and is now live on Chickenloop.
      </p>

      <p>
        <a href="${jobUrl}">View your job posting</a>
      </p>

      <h3>Manage your job</h3>

      <p>
        You can edit your job posting at any time from your recruiter dashboard:
      </p>

      <p>
        <a href="${dashboardUrl}">Open Recruiter Dashboard</a>
      </p>

      <h3>Increase visibility</h3>

      <p>
        Featured Jobs receive significantly higher visibility and typically attract more applicants.
        You can feature your job directly from the recruiter dashboard.
      </p>

      <h3>Keep your job near the top</h3>

      <p>
        If you are still hiring, you can use the <strong>Refresh Job</strong> button in the dashboard to move your listing back to the top of search results.
      </p>

      <h3>Position filled?</h3>

      <p>
        Once the position has been filled, please unpublish or delete the job posting so applicants only see active opportunities.
      </p>

      <p>
        Thank you for using Chickenloop.
      </p>

      <p>
        Best regards,<br />
        Sven<br />
        Founder, Chickenloop.com
      </p>
    `;

  const text = `Hi ${greeting},

Your job posting "${jobTitle}" has been published successfully and is now live on Chickenloop.

View your job posting: ${jobUrl}

Manage your job
You can edit your job posting at any time from your recruiter dashboard:
${dashboardUrl}

Increase visibility
Featured Jobs receive significantly higher visibility and typically attract more applicants. You can feature your job directly from the recruiter dashboard.

Keep your job near the top
If you are still hiring, you can use the Refresh Job button in the dashboard to move your listing back to the top of search results.

Position filled?
Once the position has been filled, please unpublish or delete the job posting so applicants only see active opportunities.

Thank you for using Chickenloop.

Best regards,
Sven
Founder, Chickenloop.com`;

  return {
    subject: `Your job "${jobTitle}" is now live on Chickenloop`,
    html,
    text,
  };
}
