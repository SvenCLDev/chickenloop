import { sendEmail, EmailCategory } from '@/lib/email';
import { referenceRequestFyiEmail } from '@/lib/email/templates/referenceRequestFyi';
import { getBaseUrlForAuthEmails } from '@/lib/baseUrlForAuthEmails';
import { REFERENCE_EXPIRY_DAYS } from '@/lib/talentNetwork/referenceFollowupConstants';
import { logReferenceMetric } from '@/lib/talentNetwork/referenceMetrics';

function getProfileEditUrl(): string {
  return `${getBaseUrlForAuthEmails()}/job-seeker/profile/talent-network/edit`;
}

/**
 * Token-free FYI to the job seeker. Never Cc on the manager message.
 */
export async function sendReferenceRequestFyi(input: {
  jobSeekerEmail: string;
  jobSeekerName?: string;
  jobSeekerUserId?: string;
  schoolName: string;
  seasonLabel?: string;
  managerEmail: string;
  managerName?: string;
  reason: 'initial' | 'reminder' | 'resend_fyi';
  experienceEntryId?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string; chaseSnippet?: string }> {
  const content = referenceRequestFyiEmail({
    jobSeekerName: input.jobSeekerName,
    schoolName: input.schoolName,
    seasonLabel: input.seasonLabel,
    managerEmail: input.managerEmail,
    managerName: input.managerName,
    expiresInDays: REFERENCE_EXPIRY_DAYS,
    profileUrl: getProfileEditUrl(),
    reason: input.reason,
  });

  const result = await sendEmail({
    to: input.jobSeekerEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
    category: EmailCategory.IMPORTANT_TRANSACTIONAL,
    eventType: 'reference_request_fyi',
    userId: input.jobSeekerUserId,
  });

  if (result.success) {
    logReferenceMetric('reference_fyi_sent_seeker', {
      reason: input.reason,
      experienceEntryId: input.experienceEntryId,
      userId: input.jobSeekerUserId,
    });
  }

  return { ...result, chaseSnippet: content.chaseSnippet };
}
