import { sendEmail, EmailCategory, formatFromAddress, getFromEmail } from '@/lib/email';
import { referenceVerificationEmail } from '@/lib/email/templates/referenceVerification';
import {
  buildReferenceConfirmPageUrl,
  buildReferenceConfirmUrl,
} from '@/lib/referenceVerificationToken';

function getReferenceReplyTo(): string {
  return (
    process.env.RESEND_REPLY_TO_EMAIL?.trim() ||
    process.env.CONTACT_EMAIL?.trim() ||
    'hello@chickenloop.com'
  );
}

function getReferenceFrom(candidateName?: string): string {
  const email = process.env.RESEND_REFERENCE_FROM_EMAIL?.trim() || getFromEmail();
  const trimmed = candidateName?.trim();
  const name =
    process.env.RESEND_REFERENCE_FROM_NAME?.trim() ||
    (trimmed ? `${trimmed} via Chickenloop` : 'Chickenloop References');
  return formatFromAddress(email, name);
}

/**
 * Manager reference request. Never Cc the seeker — confirm links are bearer tokens.
 */
export async function sendReferenceVerificationEmail(input: {
  managerEmail: string;
  candidateName: string;
  schoolName: string;
  seasonLabel?: string;
  managerName?: string;
  seekerNote?: string;
  token: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const emailContent = referenceVerificationEmail({
    candidateName: input.candidateName,
    schoolName: input.schoolName,
    seasonLabel: input.seasonLabel,
    managerName: input.managerName,
    seekerNote: input.seekerNote,
    confirmWorkedRehireUrl: buildReferenceConfirmUrl(input.token, 'worked-rehire'),
    confirmWorkedNoRehireUrl: buildReferenceConfirmUrl(input.token, 'worked-no-rehire'),
    confirmNotWorkedUrl: buildReferenceConfirmUrl(input.token, 'not-worked'),
    confirmPageUrl: buildReferenceConfirmPageUrl(input.token),
  });

  return sendEmail({
    to: input.managerEmail,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
    from: getReferenceFrom(input.candidateName),
    replyTo: getReferenceReplyTo(),
    category: EmailCategory.IMPORTANT_TRANSACTIONAL,
    eventType: 'reference_verification',
  });
}
