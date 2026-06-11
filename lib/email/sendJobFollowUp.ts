import { sendEmail, EmailCategory } from '@/lib/email';
import { getBaseUrlForAuthEmails } from '@/lib/baseUrlForAuthEmails';
import { jobFollowUpEmail } from '@/lib/email/templates/jobFollowUp';

function getSiteBaseUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (siteUrl) return siteUrl;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
  if (baseUrl) return baseUrl;
  return getBaseUrlForAuthEmails();
}

export function buildJobFollowUpUrls(companyId?: string | null): {
  dashboardUrl: string;
  companyProfileUrl: string;
} {
  const baseUrl = getSiteBaseUrl();
  return {
    dashboardUrl: `${baseUrl}/recruiter`,
    companyProfileUrl: companyId
      ? `${baseUrl}/companies/${companyId}`
      : `${baseUrl}/recruiter/company/edit`,
  };
}

export async function sendJobFollowUp({
  recruiterEmail,
  recruiterName,
  recruiterUserId,
  activeJobsCount,
  dashboardUrl,
  companyProfileUrl,
}: {
  recruiterEmail: string;
  recruiterName?: string;
  recruiterUserId?: string;
  activeJobsCount: number;
  dashboardUrl: string;
  companyProfileUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const email = jobFollowUpEmail({
    recruiterName,
    activeJobsCount,
    dashboardUrl,
    companyProfileUrl,
  });

  return sendEmail({
    to: recruiterEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
    category: EmailCategory.SYSTEM,
    eventType: 'job_follow_up',
    userId: recruiterUserId,
    tags: [
      { name: 'type', value: 'job' },
      { name: 'event', value: 'job_follow_up' },
      { name: 'active_jobs', value: String(activeJobsCount) },
    ],
  });
}
