import { sendEmailAsync, EmailCategory } from '@/lib/email';
import { getBaseUrlForAuthEmails } from '@/lib/baseUrlForAuthEmails';
import { jobPostedConfirmationEmail } from '@/lib/email/templates/jobPostedConfirmation';
import { generateJobUrlPath } from '@/lib/jobSlug';

function getSiteBaseUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (siteUrl) return siteUrl;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
  if (baseUrl) return baseUrl;
  return getBaseUrlForAuthEmails();
}

export async function sendJobPostedConfirmation({
  recruiterEmail,
  recruiterName,
  recruiterUserId,
  jobTitle,
  jobUrl,
  dashboardUrl,
}: {
  recruiterEmail: string;
  recruiterName?: string;
  recruiterUserId?: string;
  jobTitle: string;
  jobUrl: string;
  dashboardUrl: string;
}): Promise<void> {
  const email = jobPostedConfirmationEmail({
    recruiterName,
    jobTitle,
    jobUrl,
    dashboardUrl,
  });

  await sendEmailAsync({
    to: recruiterEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
    category: EmailCategory.SYSTEM,
    eventType: 'job_posted_confirmation',
    userId: recruiterUserId,
    tags: [
      { name: 'type', value: 'job' },
      { name: 'event', value: 'job_posted_confirmation' },
    ],
  });
}

/** Build canonical live job URL and recruiter dashboard URL for confirmation emails. */
export function buildJobPostedConfirmationUrls(
  jobTitle: string,
  country?: string | null
): { jobUrl: string; dashboardUrl: string } {
  const baseUrl = getSiteBaseUrl();
  const jobPath = generateJobUrlPath(jobTitle, country);
  return {
    jobUrl: `${baseUrl}${jobPath}`,
    dashboardUrl: `${baseUrl}/recruiter`,
  };
}
