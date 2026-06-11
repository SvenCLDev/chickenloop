export function jobFollowUpEmail({
  recruiterName,
  activeJobsCount,
  dashboardUrl,
  companyProfileUrl,
}: {
  recruiterName?: string;
  activeJobsCount: number;
  dashboardUrl: string;
  companyProfileUrl: string;
}) {
  const greeting = recruiterName || 'there';
  const listingsLabel = activeJobsCount === 1 ? 'active job listing' : 'active job listings';

  const html = `
      <p>Hi ${greeting},</p>

      <p>
        We noticed you still have <strong>${activeJobsCount}</strong> ${listingsLabel} on Chickenloop.
      </p>

      <p>
        We wanted to check in and see whether you are still looking for candidates.
      </p>

      <p>
        <a href="${dashboardUrl}">Open Recruiter Dashboard</a>
      </p>

      <h3>Need more visibility?</h3>

      <p>
        Featured Jobs receive significantly higher visibility and typically attract more applicants.
        You can upgrade your listings directly from your recruiter dashboard.
      </p>

      <h3>Keep your jobs near the top</h3>

      <p>
        If you're still hiring, you can use the <strong>Refresh Job</strong> button in the dashboard to move your listings back to the top of search results.
      </p>

      <h3>Positions already filled?</h3>

      <p>
        If any positions have been filled, please unpublish or delete those job postings so applicants only see active opportunities.
      </p>

      <h3>Check your company profile</h3>

      <p>
        Please take a moment to review your company profile on Chickenloop.
      </p>

      <p>
        A complete company profile helps job seekers learn more about your business and can also improve your company's visibility in search engines.
      </p>

      <p>
        <a href="${companyProfileUrl}">
          View Company Profile
        </a>
      </p>

      <p>
        Thank you for using Chickenloop.
      </p>

      <p>
        Best regards,<br/>
        Sven<br/>
        Founder, Chickenloop.com
      </p>
    `;

  const text = `Hi ${greeting},

We noticed you still have ${activeJobsCount} ${listingsLabel} on Chickenloop.

We wanted to check in and see whether you are still looking for candidates.

Open Recruiter Dashboard: ${dashboardUrl}

Need more visibility?
Featured Jobs receive significantly higher visibility and typically attract more applicants. You can upgrade your listings directly from your recruiter dashboard.

Keep your jobs near the top
If you're still hiring, you can use the Refresh Job button in the dashboard to move your listings back to the top of search results.

Positions already filled?
If any positions have been filled, please unpublish or delete those job postings so applicants only see active opportunities.

Check your company profile
Please take a moment to review your company profile on Chickenloop.

A complete company profile helps job seekers learn more about your business and can also improve your company's visibility in search engines.

View Company Profile: ${companyProfileUrl}

Thank you for using Chickenloop.

Best regards,
Sven
Founder, Chickenloop.com`;

  return {
    subject: `Checking in on your ${activeJobsCount} active job listing${activeJobsCount === 1 ? '' : 's'} on Chickenloop`,
    html,
    text,
  };
}
