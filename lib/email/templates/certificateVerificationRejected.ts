function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function certificateVerificationRejectedEmail({
  seekerName,
  certificateLabel,
  reason,
  profileEditUrl,
}: {
  seekerName?: string;
  certificateLabel: string;
  reason: string;
  profileEditUrl: string;
}) {
  const greeting = escapeHtml(seekerName?.trim() || 'there');
  const safeLabel = escapeHtml(certificateLabel.trim() || 'your certificate');
  const safeReason = escapeHtml(reason.trim());
  const safeReasonText = reason.trim();
  const safeLabelText = certificateLabel.trim() || 'your certificate';
  const greetingText = seekerName?.trim() || 'there';

  const subject = 'Your certificate verification needs an update';

  const html = `
      <p>Hi ${greeting},</p>

      <p>
        We reviewed the document you submitted for
        <strong>${safeLabel}</strong> and could not verify it yet.
      </p>

      <p><strong>Reason:</strong> ${safeReason}</p>

      <p>
        Please upload a clear photo or PDF of the actual qualification certificate
        (not a CV or resume), then save your profile so we can review it again.
      </p>

      <p style="margin: 28px 0;">
        <a href="${profileEditUrl}"
           style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: 600;">
          Update your certificate
        </a>
      </p>

      <p>
        Best regards,<br/>
        The Chickenloop team
      </p>
    `;

  const text = `Hi ${greetingText},

We reviewed the document you submitted for ${safeLabelText} and could not verify it yet.

Reason: ${safeReasonText}

Please upload a clear photo or PDF of the actual qualification certificate (not a CV or resume), then save your profile so we can review it again.

Update your certificate: ${profileEditUrl}

Best regards,
The Chickenloop team
`;

  return { subject, html, text };
}
