import { sendEmail, EmailCategory } from '@/lib/email';
import { referenceReminderSentEmail } from '@/lib/email/templates/referenceReminderSent';
import { getBaseUrlForAuthEmails } from '@/lib/baseUrlForAuthEmails';

function getProfileEditUrl(): string {
  return `${getBaseUrlForAuthEmails()}/job-seeker/cv/talent-network/edit`;
}

export async function sendReferenceReminderSent({
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
  const content = referenceReminderSentEmail({
    jobSeekerName,
    schoolName,
    seasonLabel,
    managerEmail,
    profileUrl: getProfileEditUrl(),
  });

  return sendEmail({
    to: jobSeekerEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
    category: EmailCategory.IMPORTANT_TRANSACTIONAL,
    eventType: 'reference_reminder_sent',
    userId: jobSeekerUserId,
  });
}
