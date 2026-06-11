export function adminPostedJobEmail({
  recruiterName,
  recruiterEmail,
  companyName,
  jobTitle,
  jobUrl,
  dashboardUrl,
}: {
  recruiterName?: string;
  recruiterEmail: string;
  companyName: string;
  jobTitle: string;
  jobUrl: string;
  dashboardUrl: string;
}) {
  const greeting = recruiterName ? ` ${recruiterName}` : '';

  const html = `
      <p>Hello${greeting},</p>

      <p>
        I noticed that <strong>${companyName}</strong> is currently recruiting for a
        <strong>${jobTitle}</strong>.
      </p>

      <p>
        I run Chickenloop.com, a niche job board dedicated to the watersports industry.
        Each month, thousands of watersports professionals visit the site looking for opportunities just like yours.
      </p>

      <p>
        To help increase visibility for your position, I have taken the liberty of creating a job listing for you:
      </p>

      <p>
        <a href="${jobUrl}">
          View Job Listing
        </a>
      </p>

      <p>
        The listing is completely free and you are welcome to manage it yourself going forward.
      </p>

      <p>
        You can access the recruiter dashboard using:
      </p>

      <p>
        <strong>${recruiterEmail}</strong>
      </p>

      <p>
        If you have not logged in before, simply use the password reset function to create a password for your account.
      </p>

      <p>
        Recruiters can:
      </p>

      <ul>
        <li>Edit job details</li>
        <li>Mark jobs as featured for additional visibility</li>
        <li>Use the <strong>Refresh Job</strong> button to move jobs back to the top of search results</li>
        <li>Manage company information</li>
      </ul>

      <p>
        Open Recruiter Dashboard:
      </p>

      <p>
        <a href="${dashboardUrl}">
          Open Dashboard
        </a>
      </p>

      <p>
        As an added bonus, jobs published on Chickenloop are structured to be indexed by Google Jobs, helping increase visibility beyond the platform itself.
      </p>

      <p>
        If the position has already been filled, or if you would prefer the listing to be removed, simply reply to this email and I will take care of it.
      </p>

      <p>
        If you have any questions or need help managing the listing, feel free to get in touch.
      </p>

      <p>
        Best regards,
      </p>

      <p>
        Sven Kelling<br/>
        Founder, Chickenloop.com
      </p>
    `;

  const text = `Hello${greeting},

I noticed that ${companyName} is currently recruiting for a ${jobTitle}.

I run Chickenloop.com, a niche job board dedicated to the watersports industry. Each month, thousands of watersports professionals visit the site looking for opportunities just like yours.

To help increase visibility for your position, I have taken the liberty of creating a job listing for you:

View Job Listing: ${jobUrl}

The listing is completely free and you are welcome to manage it yourself going forward.

You can access the recruiter dashboard using: ${recruiterEmail}

If you have not logged in before, simply use the password reset function to create a password for your account.

Recruiters can:
- Edit job details
- Mark jobs as featured for additional visibility
- Use the Refresh Job button to move jobs back to the top of search results
- Manage company information

Open Recruiter Dashboard: ${dashboardUrl}

As an added bonus, jobs published on Chickenloop are structured to be indexed by Google Jobs, helping increase visibility beyond the platform itself.

If the position has already been filled, or if you would prefer the listing to be removed, simply reply to this email and I will take care of it.

If you have any questions or need help managing the listing, feel free to get in touch.

Best regards,
Sven Kelling
Founder, Chickenloop.com`;

  return {
    subject: `${jobTitle} is now live on Chickenloop`,
    html,
    text,
  };
}
