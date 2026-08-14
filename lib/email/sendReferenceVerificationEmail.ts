import { sendEmail, EmailCategory } from '@/lib/email';
import { referenceVerificationEmail } from '@/lib/email/templates/referenceVerification';
import { buildReferenceConfirmUrl } from '@/lib/referenceVerificationToken';

export async function sendReferenceVerificationEmail(input: {
  managerEmail: string;
  candidateName: string;
  schoolName: string;
  seasonLabel?: string;
  token: string;
}): Promise<{ success: boolean; error?: string }> {
  const emailContent = referenceVerificationEmail({
    candidateName: input.candidateName,
    schoolName: input.schoolName,
    seasonLabel: input.seasonLabel,
    confirmYesUrl: buildReferenceConfirmUrl(input.token, true),
    confirmNoUrl: buildReferenceConfirmUrl(input.token, false),
  });

  return sendEmail({
    to: input.managerEmail,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
    category: EmailCategory.IMPORTANT_TRANSACTIONAL,
    eventType: 'reference_verification',
  });
}
