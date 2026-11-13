import { sendEmail, EmailCategory } from '@/lib/email';
import { getBaseUrlForAuthEmails } from '@/lib/baseUrlForAuthEmails';
import { certificateVerificationRejectedEmail } from '@/lib/email/templates/certificateVerificationRejected';

function getSiteBaseUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (siteUrl) return siteUrl;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
  if (baseUrl) return baseUrl;
  return getBaseUrlForAuthEmails();
}

export function buildCertificateProfileEditUrl(): string {
  return `${getSiteBaseUrl()}/job-seeker/profile/talent-network/edit`;
}

export async function sendCertificateVerificationRejected({
  seekerEmail,
  seekerName,
  seekerUserId,
  certificateLabel,
  reason,
}: {
  seekerEmail: string;
  seekerName?: string;
  seekerUserId?: string;
  certificateLabel: string;
  reason: string;
}): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const profileEditUrl = buildCertificateProfileEditUrl();
  const email = certificateVerificationRejectedEmail({
    seekerName,
    certificateLabel,
    reason,
    profileEditUrl,
  });

  return sendEmail({
    to: seekerEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
    category: EmailCategory.USER_NOTIFICATION,
    eventType: 'certificate_verification_rejected',
    userId: seekerUserId,
    tags: [
      { name: 'type', value: 'certificate' },
      { name: 'event', value: 'certificate_verification_rejected' },
    ],
  });
}
