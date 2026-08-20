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

function getReferenceFrom(): string {
  const email = process.env.RESEND_REFERENCE_FROM_EMAIL?.trim() || getFromEmail();
  const name =
    process.env.RESEND_REFERENCE_FROM_NAME?.trim() || 'Chickenloop References';
  return formatFromAddress(email, name);
}

export async function sendReferenceVerificationEmail(input: {
  managerEmail: string;
  candidateName: string;
  schoolName: string;
  seasonLabel?: string;
  managerName?: string;
  token: string;
}): Promise<{ success: boolean; error?: string }> {
  const emailContent = referenceVerificationEmail({
    candidateName: input.candidateName,
    schoolName: input.schoolName,
    seasonLabel: input.seasonLabel,
    managerName: input.managerName,
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
    from: getReferenceFrom(),
    replyTo: getReferenceReplyTo(),
    category: EmailCategory.IMPORTANT_TRANSACTIONAL,
    eventType: 'reference_verification',
  });
}
