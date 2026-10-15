import { sendEmail, EmailCategory } from '@/lib/email';
import { getBaseUrlForAuthEmails } from '@/lib/baseUrlForAuthEmails';
import { talentMatchDigestEmail } from '@/lib/email/templates/talentMatchDigest';

function getSiteBaseUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (siteUrl) return siteUrl;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
  if (baseUrl) return baseUrl;
  return getBaseUrlForAuthEmails();
}

export function buildTalentMatchDashboardUrl(): string {
  return `${getSiteBaseUrl()}/recruiter`;
}

export async function sendTalentMatchEmail({
  recruiterEmail,
  recruiterName,
  recruiterUserId,
  jobTitle,
  matchCount,
  matchUrl,
}: {
  recruiterEmail: string;
  recruiterName?: string;
  recruiterUserId: string;
  jobTitle: string;
  matchCount: number;
  matchUrl: string;
}): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const dashboardUrl = buildTalentMatchDashboardUrl();
  const absoluteMatchUrl = matchUrl.startsWith('http')
    ? matchUrl
    : `${getSiteBaseUrl()}${matchUrl.startsWith('/') ? '' : '/'}${matchUrl}`;
  const email = talentMatchDigestEmail({
    recruiterName,
    jobTitle,
    matchCount,
    matchUrl: absoluteMatchUrl,
    dashboardUrl,
  });

  return sendEmail({
    to: recruiterEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
    category: EmailCategory.USER_NOTIFICATION,
    eventType: 'talent_match',
    userId: recruiterUserId,
    unsubscribePreferenceKey: 'talentMatchEmails',
    tags: [
      { name: 'type', value: 'talent' },
      { name: 'event', value: 'talent_match' },
      { name: 'match_count', value: String(matchCount) },
    ],
  });
}
