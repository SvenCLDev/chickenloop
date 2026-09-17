import { sendEmail, EmailCategory } from '@/lib/email';
import { referenceEmailBouncedEmail } from '@/lib/email/templates/referenceEmailBounced';
import { getBaseUrlForAuthEmails } from '@/lib/baseUrlForAuthEmails';

function getProfileEditUrl(): string {
  return `${getBaseUrlForAuthEmails()}/job-seeker`;
}

export async function sendReferenceEmailBounced({
  jobSeekerEmail,
  jobSeekerName,
  jobSeekerUserId,
  schoolName,
  seasonLabel,
  managerEmail,
}: {
  jobSeekerEmail: string;
  jobSeekerName?: string;
  jobSeekerUserId?: string;
  schoolName: string;
  seasonLabel?: string;
  managerEmail: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const profileUrl = getProfileEditUrl();
  const content = referenceEmailBouncedEmail({
    jobSeekerName,
    schoolName,
    seasonLabel,
    managerEmail,
    profileUrl,
  });

  return sendEmail({
    to: jobSeekerEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
    category: EmailCategory.IMPORTANT_TRANSACTIONAL,
    eventType: 'reference_email_bounced',
    userId: jobSeekerUserId,
  });
}
