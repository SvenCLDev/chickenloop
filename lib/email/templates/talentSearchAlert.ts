type CandidateCard = {
  headline: string;
  availability?: string;
  sports?: string[];
  locationSnippet?: string;
  profileUrl: string;
  matchedSearches?: string[];
};

export function talentSearchAlertEmail({
  recruiterName,
  candidates,
  dashboardUrl,
  isDigest,
}: {
  recruiterName?: string;
  candidates: CandidateCard[];
  dashboardUrl: string;
  isDigest?: boolean;
}) {
  const greeting = recruiterName || 'there';
  const count = candidates.length;
  const subject =
    count === 1
      ? 'New watersports professional matches your search'
      : `${count} new watersports professionals match your searches`;

  const cardsHtml = candidates
    .map((c) => {
      const meta = [
        c.availability?.replace(/_/g, ' '),
        c.sports?.slice(0, 3).join(', '),
        c.locationSnippet,
      ]
        .filter(Boolean)
        .join(' · ');
      const searches =
        c.matchedSearches && c.matchedSearches.length > 0
          ? `<p style="margin:4px 0 0;font-size:13px;color:#64748b;">Matched: ${c.matchedSearches.join(', ')}</p>`
          : '';
      return `
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:12px 0;">
          <p style="margin:0;font-weight:600;font-size:16px;">${c.headline}</p>
          ${meta ? `<p style="margin:6px 0 0;color:#475569;font-size:14px;">${meta}</p>` : ''}
          ${searches}
          <p style="margin:12px 0 0;">
            <a href="${c.profileUrl}" style="color:#2563eb;font-weight:600;text-decoration:none;">View profile</a>
          </p>
        </div>`;
    })
    .join('');

  const intro = isDigest
    ? `Here are new Talent Network profiles that match your saved searches.`
    : `A new candidate has joined Chickenloop and matches your saved search.`;

  const html = `
    <p>Hi ${greeting},</p>
    <p>${intro}</p>
    ${cardsHtml}
    <p style="margin:24px 0;">
      <a href="${dashboardUrl}"
         style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;">
        Manage Talent Alerts
      </a>
    </p>
    <p>Best regards,<br/>The Chickenloop Team</p>
  `;

  const textLines = candidates.map((c) => {
    const meta = [c.availability, c.sports?.join(', '), c.locationSnippet]
      .filter(Boolean)
      .join(' · ');
    return `${c.headline}\n${meta}\n${c.profileUrl}`;
  });

  const text = `Hi ${greeting},

${intro}

${textLines.join('\n\n')}

Manage Talent Alerts: ${dashboardUrl}

Best regards,
The Chickenloop Team
`;

  return { subject, html, text };
}

export function favouriteAvailabilityAlertEmail({
  recruiterName,
  headline,
  previousAvailability,
  newAvailability,
  profileUrl,
  dashboardUrl,
}: {
  recruiterName?: string;
  headline: string;
  previousAvailability?: string;
  newAvailability: string;
  profileUrl: string;
  dashboardUrl: string;
}) {
  const greeting = recruiterName || 'there';
  const subject = 'A candidate in your favourites is now available';
  const prev = (previousAvailability || 'unknown').replace(/_/g, ' ');
  const next = newAvailability.replace(/_/g, ' ');

  const html = `
    <p>Hi ${greeting},</p>
    <p>A candidate you saved as a favourite has updated their availability:</p>
    <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-weight:600;font-size:16px;">${headline}</p>
      <p style="margin:8px 0 0;color:#475569;">Previous: ${prev}</p>
      <p style="margin:4px 0 0;color:#475569;">New: <strong>${next}</strong></p>
      <p style="margin:12px 0 0;">
        <a href="${profileUrl}" style="color:#2563eb;font-weight:600;text-decoration:none;">View profile</a>
      </p>
    </div>
    <p><a href="${dashboardUrl}">Open recruiter dashboard</a></p>
    <p>Best regards,<br/>The Chickenloop Team</p>
  `;

  const text = `Hi ${greeting},

A candidate you saved as a favourite has updated their availability:

${headline}
Previous: ${prev}
New: ${next}
${profileUrl}

Dashboard: ${dashboardUrl}

Best regards,
The Chickenloop Team
`;

  return { subject, html, text };
}
