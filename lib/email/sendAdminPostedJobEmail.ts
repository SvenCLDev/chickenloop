import { sendEmail, EmailCategory } from '@/lib/email';
import { adminPostedJobEmail } from '@/lib/email/templates/adminPostedJobEmail';

export async function sendAdminPostedJobEmail({
  recruiterName,
  recruiterEmail,
  companyName,
  jobTitle,
  jobUrl,
  dashboardUrl,
  recruiterUserId,
}: {
  recruiterName?: string;
  recruiterEmail: string;
  companyName: string;
  jobTitle: string;
  jobUrl: string;
  dashboardUrl: string;
  recruiterUserId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const email = adminPostedJobEmail({
    recruiterName,
    recruiterEmail,
    companyName,
    jobTitle,
    jobUrl,
    dashboardUrl,
  });

  return sendEmail({
    to: recruiterEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
    category: EmailCategory.SYSTEM,
    eventType: 'admin_posted_job_outreach',
    userId: recruiterUserId,
    tags: [
      { name: 'type', value: 'job' },
      { name: 'event', value: 'admin_posted_job_outreach' },
    ],
  });
}
