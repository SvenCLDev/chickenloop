/**
 * Email templates for ATS (Applicant Tracking System) events
 */

export interface ApplicationEmailData {
  candidateName: string;
  candidateEmail: string;
  recruiterName: string;
  recruiterEmail: string;
  jobTitle?: string;
  jobCompany?: string;
  jobCity?: string;
  status?: string;
  applicationDate?: Date;
}

/**
 * Email: Candidate applied to job
 * Sent to: Recruiter
 */
export function getCandidateAppliedEmail(data: ApplicationEmailData): { subject: string; html: string; text: string } {
  const { candidateName, candidateEmail, jobTitle, jobCompany, jobCity, applicationDate } = data;
  
  const dateStr = applicationDate ? new Date(applicationDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }) : 'recently';

  const subject = `New Application: ${candidateName} applied for ${jobTitle || 'your job posting'}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb; margin-bottom: 20px;">New Job Application</h2>
      
      <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px 0;"><strong>Candidate:</strong> ${candidateName}</p>
        <p style="margin: 0 0 10px 0;"><strong>Email:</strong> <a href="mailto:${candidateEmail}" style="color: #2563eb; text-decoration: none;">${candidateEmail}</a></p>
        <p style="margin: 0;"><strong>Applied:</strong> ${dateStr}</p>
      </div>

      ${jobTitle ? `
        <div style="background-color: #ffffff; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #374151; margin-top: 0;">Job Details</h3>
          <p style="margin: 5px 0;"><strong>Position:</strong> ${jobTitle}</p>
          ${jobCompany ? `<p style="margin: 5px 0;"><strong>Company:</strong> ${jobCompany}</p>` : ''}
          ${jobCity ? `<p style="margin: 5px 0;"><strong>City:</strong> ${jobCity}</p>` : ''}
        </div>
      ` : ''}

      <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb;">
        <p style="margin: 0; color: #1e40af;">
          <strong>Next Steps:</strong> Review this application in your dashboard and update the status as you progress through your hiring process.
        </p>
      </div>
    </div>
  `;

  const text = `New Job Application

Candidate: ${candidateName}
Email: ${candidateEmail}
Applied: ${dateStr}

${jobTitle ? `Job Details:
Position: ${jobTitle}
${jobCompany ? `Company: ${jobCompany}\n` : ''}${jobCity ? `City: ${jobCity}\n` : ''}` : ''}

Next Steps: Review this application in your dashboard and update the status as you progress through your hiring process.`;

  return { subject, html, text };
}

/**
 * Email: Recruiter contacted candidate
 * Sent to: Candidate
 */
export function getRecruiterContactedEmail(data: ApplicationEmailData): { subject: string; html: string; text: string } {
  const { recruiterName, recruiterEmail, jobTitle, jobCompany, jobCity } = data;

  const subject = jobTitle 
    ? `${recruiterName} from ${jobCompany || 'a company'} is interested in your profile`
    : `${recruiterName} is interested in your profile`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb; margin-bottom: 20px;">New Contact from Recruiter</h2>
      
      <p>Hello,</p>
      
      <p><strong>${recruiterName}</strong> has reached out to you through Chickenloop.</p>

      ${jobTitle ? `
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">Position of Interest</h3>
          <p style="margin: 5px 0;"><strong>Position:</strong> ${jobTitle}</p>
          ${jobCompany ? `<p style="margin: 5px 0;"><strong>Company:</strong> ${jobCompany}</p>` : ''}
          ${jobCity ? `<p style="margin: 5px 0;"><strong>City:</strong> ${jobCity}</p>` : ''}
        </div>
      ` : ''}

      <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
        <p style="margin: 0; color: #1e40af;">
          <strong>What's Next?</strong> The recruiter may contact you directly to discuss opportunities. Keep an eye on your email and the Chickenloop platform for updates.
        </p>
      </div>

      <p style="margin-top: 20px;">
        You can contact the recruiter at: <a href="mailto:${recruiterEmail}" style="color: #2563eb; text-decoration: none;">${recruiterEmail}</a>
      </p>
    </div>
  `;

  const text = `New Contact from Recruiter

Hello,

${recruiterName} has reached out to you through Chickenloop.

${jobTitle ? `Position of Interest:
Position: ${jobTitle}
${jobCompany ? `Company: ${jobCompany}\n` : ''}${jobCity ? `City: ${jobCity}\n` : ''}` : ''}

What's Next? The recruiter may contact you directly to discuss opportunities. Keep an eye on your email and the Chickenloop platform for updates.

You can contact the recruiter at: ${recruiterEmail}`;

  return { subject, html, text };
}

/**
 * Email: Application status changed
 * Sent to: Candidate
 * Only sent for: contacted, interviewing, offered, rejected
 */
export function getStatusChangedEmail(data: ApplicationEmailData): { subject: string; html: string; text: string } {
  const { candidateName, recruiterName, jobTitle, jobCompany, status } = data;

  const statusLabels: Record<string, string> = {
    contacted: 'Contacted',
    interviewing: 'Interviewing',
    offered: 'Offer Extended',
    rejected: 'Not Selected',
  };

  const statusLabel = statusLabels[status || ''] || status || 'Updated';

  const statusColors: Record<string, string> = {
    contacted: '#06b6d4',
    interviewing: '#eab308',
    offered: '#f97316',
    rejected: '#ef4444',
  };

  const statusColor = statusColors[status || ''] || '#6b7280';

  // Get base URL from environment or default
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const dashboardUrl = `${baseUrl}/job-seeker`;

  const subject = `Application Update: ${statusLabel}${jobTitle ? ` - ${jobTitle}` : ''}`;

  // Status-specific messages (neutral and informational)
  let statusMessage = '';
  if (status === 'contacted') {
    statusMessage = 'The recruiter has reached out regarding your application. They may contact you directly to discuss next steps.';
  } else if (status === 'interviewing') {
    statusMessage = 'Your application has progressed to the interview stage. The recruiter will contact you with details about the interview process.';
  } else if (status === 'offered') {
    statusMessage = 'An offer has been extended for this position. The recruiter will contact you with details about the offer.';
  } else if (status === 'rejected') {
    statusMessage = 'Thank you for your interest in this position. While this opportunity didn\'t work out, we encourage you to continue exploring other positions on Chickenloop.';
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb; margin-bottom: 20px;">Application Status Update</h2>
      
      <p>Hello ${candidateName || ''},</p>
      
      <p>The status of your application has been updated.</p>

      ${jobTitle ? `
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">Job Details</h3>
          <p style="margin: 5px 0;"><strong>Position:</strong> ${jobTitle}</p>
          ${jobCompany ? `<p style="margin: 5px 0;"><strong>Company:</strong> ${jobCompany}</p>` : ''}
        </div>
      ` : ''}

      <div style="background-color: ${statusColor}15; padding: 15px; border-radius: 8px; border-left: 4px solid ${statusColor}; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;">
          <strong style="color: ${statusColor};">Status: ${statusLabel}</strong>
        </p>
        ${statusMessage ? `<p style="margin: 0; color: #374151;">${statusMessage}</p>` : ''}
      </div>

      <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
        <p style="margin: 0; color: #1e40af; font-size: 14px;">
          <strong>Next Steps:</strong> You can view all your applications and their current status in your Chickenloop dashboard.
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">View My Applications</a>
      </div>

      ${recruiterName ? `
        <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
          Recruiter: ${recruiterName}
        </p>
      ` : ''}
    </div>
  `;

  const text = `Application Status Update

Hello ${candidateName || ''},

The status of your application has been updated.

${jobTitle ? `Job Details:
Position: ${jobTitle}
${jobCompany ? `Company: ${jobCompany}\n` : ''}` : ''}

Status: ${statusLabel}
${statusMessage ? `\n${statusMessage}\n` : ''}

Next Steps: You can view all your applications and their current status in your Chickenloop dashboard.

View My Applications: ${dashboardUrl}
${recruiterName ? `\nRecruiter: ${recruiterName}` : ''}`;

  return { subject, html, text };
}

/**
 * Email: Job search alert
 * Sent to: Job seeker with matching jobs
 */
export interface JobAlertEmailData {
  userName: string;
  userEmail: string;
  searchName?: string;
  jobs: Array<{
    _id: string;
    title: string;
    company: string;
    city: string;
    country?: string;
    description: string;
    type: string;
    featured?: boolean;
    createdAt: Date;
    url?: string;
  }>;
  frequency: 'daily' | 'weekly';
}

export function getJobAlertEmail(data: JobAlertEmailData): { subject: string; html: string; text: string } {
  const { userName, searchName, jobs, frequency } = data;
  
  const jobCount = jobs.length;
  const frequencyText = frequency === 'daily' ? 'daily' : 'weekly';
  
  const subject = searchName
    ? `New Jobs Matching "${searchName}" - ${jobCount} ${jobCount === 1 ? 'job' : 'jobs'} found`
    : `New Jobs Matching Your Search - ${jobCount} ${jobCount === 1 ? 'job' : 'jobs'} found`;

  const jobsHtml = jobs.map((job) => {
    const jobUrl = job.url || `https://chickenloop.com/jobs/${job._id}`;
    const dateStr = new Date(job.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    
    return `
      <div style="background-color: ${job.featured ? '#fef3c7' : '#ffffff'}; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 15px; ${job.featured ? 'border-left: 4px solid #f59e0b;' : ''}">
        ${job.featured ? '<div style="background-color: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; display: inline-block; font-size: 12px; font-weight: bold; margin-bottom: 10px;">⭐ Featured</div>' : ''}
        <h3 style="margin: 0 0 10px 0; color: #1f2937;">
          <a href="${jobUrl}" style="color: #2563eb; text-decoration: none; font-size: 18px;">${job.title}</a>
        </h3>
        <p style="margin: 5px 0; color: #4b5563; font-weight: 600;">${job.company}</p>
        <p style="margin: 5px 0; color: #6b7280;">
          📍 ${job.city}${job.country ? `, ${job.country}` : ''}
        </p>
        <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
          💼 ${job.type.charAt(0).toUpperCase() + job.type.slice(1)} • Posted ${dateStr}
        </p>
        <p style="margin: 10px 0 0 0; color: #374151; line-height: 1.5;">
          ${job.description.substring(0, 200)}${job.description.length > 200 ? '...' : ''}
        </p>
        <a href="${jobUrl}" style="display: inline-block; margin-top: 10px; padding: 8px 16px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">View Job</a>
      </div>
    `;
  }).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb; margin-bottom: 20px;">New Jobs Matching Your Search</h2>
      
      <p>Hello ${userName},</p>
      
      <p>We found <strong>${jobCount} new ${jobCount === 1 ? 'job' : 'jobs'}</strong> that match your saved search${searchName ? ` "${searchName}"` : ''}.</p>

      ${jobCount > 0 ? `
        <div style="margin: 20px 0;">
          ${jobsHtml}
        </div>
      ` : `
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #6b7280;">No new jobs found this ${frequencyText}. We'll keep checking and notify you when new matches are available!</p>
        </div>
      `}

      <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
        <p style="margin: 0; color: #1e40af; font-size: 14px;">
          <strong>Tip:</strong> You can manage your saved searches and adjust your preferences in your Chickenloop dashboard.
        </p>
      </div>

      <p style="margin-top: 30px; color: #6b7280; font-size: 12px;">
        This is a ${frequencyText} job alert. You're receiving this because you have an active saved search on Chickenloop.
      </p>
    </div>
  `;

  const text = `New Jobs Matching Your Search

Hello ${userName},

We found ${jobCount} new ${jobCount === 1 ? 'job' : 'jobs'} that match your saved search${searchName ? ` "${searchName}"` : ''}.

${jobs.length > 0 ? jobs.map((job) => {
    const jobUrl = job.url || `https://chickenloop.com/jobs/${job._id}`;
    const dateStr = new Date(job.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    return `
${job.featured ? '⭐ FEATURED\n' : ''}${job.title}
${job.company}
📍 ${job.city}${job.country ? `, ${job.country}` : ''}
💼 ${job.type.charAt(0).toUpperCase() + job.type.slice(1)} • Posted ${dateStr}

${job.description.substring(0, 200)}${job.description.length > 200 ? '...' : ''}

View Job: ${jobUrl}
`;
  }).join('\n---\n') : `No new jobs found this ${frequencyText}. We'll keep checking and notify you when new matches are available!`}

Tip: You can manage your saved searches and adjust your preferences in your Chickenloop dashboard.

This is a ${frequencyText} job alert. You're receiving this because you have an active saved search on Chickenloop.`;

  return { subject, html, text };
}

/**
 * Email: Job alert heartbeat (monthly confirmation that search is still active)
 * Sent to: Job seeker with active saved search
 */
export interface JobAlertHeartbeatEmailData {
  userName: string;
  userEmail: string;
  searchName?: string;
}

export function getJobAlertHeartbeatEmail(data: JobAlertHeartbeatEmailData): { subject: string; html: string; text: string } {
  const { userName, searchName } = data;
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const dashboardUrl = `${baseUrl}/job-seeker`;

  const subject = searchName
    ? `Your job search "${searchName}" is still active`
    : 'Your job search is still active';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb; margin-bottom: 20px;">Your Job Search is Active</h2>
      
      <p>Hello ${userName},</p>
      
      <p>This is a quick update to let you know that your saved search${searchName ? ` "${searchName}"` : ''} is still active on Chickenloop.</p>

      <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
        <p style="margin: 0; color: #1e40af; font-size: 14px;">
          <strong>What this means:</strong> We're continuously monitoring new job postings and will notify you when we find matches. You'll receive job alerts based on your selected frequency (daily or weekly).
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Manage My Searches</a>
      </div>

      <p style="margin-top: 30px; color: #6b7280; font-size: 12px;">
        You're receiving this monthly update because you have an active saved search on Chickenloop. If you no longer wish to receive job alerts, you can disable them in your email preferences.
      </p>
    </div>
  `;

  const text = `Your Job Search is Active

Hello ${userName},

This is a quick update to let you know that your saved search${searchName ? ` "${searchName}"` : ''} is still active on Chickenloop.

What this means: We're continuously monitoring new job postings and will notify you when we find matches. You'll receive job alerts based on your selected frequency (daily or weekly).

Manage My Searches: ${dashboardUrl}

You're receiving this monthly update because you have an active saved search on Chickenloop. If you no longer wish to receive job alerts, you can disable them in your email preferences.`;

  return { subject, html, text };
}

/**
 * Email: Application withdrawn by candidate
 * Sent to: Recruiter
 */
export function getApplicationWithdrawnEmail(data: ApplicationEmailData): { subject: string; html: string; text: string } {
  const { candidateName, candidateEmail, recruiterName, jobTitle, jobCompany, jobCity } = data;

  const subject = `Application Withdrawn: ${candidateName} withdrew from ${jobTitle || 'your job posting'}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #6b7280; margin-bottom: 20px;">Application Withdrawn</h2>
      
      <p>Hello ${recruiterName},</p>
      
      <p>A candidate has withdrawn their application.</p>

      <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Candidate:</strong> ${candidateName}</p>
        <p style="margin: 0 0 10px 0;"><strong>Email:</strong> <a href="mailto:${candidateEmail}" style="color: #2563eb; text-decoration: none;">${candidateEmail}</a></p>
      </div>

      ${jobTitle ? `
        <div style="background-color: #ffffff; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">Job Details</h3>
          <p style="margin: 5px 0;"><strong>Position:</strong> ${jobTitle}</p>
          ${jobCompany ? `<p style="margin: 5px 0;"><strong>Company:</strong> ${jobCompany}</p>` : ''}
          ${jobCity ? `<p style="margin: 5px 0;"><strong>City:</strong> ${jobCity}</p>` : ''}
        </div>
      ` : ''}

      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; border-left: 4px solid #6b7280; margin: 20px 0;">
        <p style="margin: 0; color: #374151;">
          <strong>Status: Application Withdrawn</strong>
        </p>
      </div>

      <p style="margin-top: 20px;">
        You can view all applications in your Chickenloop recruiter dashboard.
      </p>
    </div>
  `;

  const text = `Application Withdrawn

Hello ${recruiterName},

A candidate has withdrawn their application.

Candidate: ${candidateName}
Email: ${candidateEmail}

${jobTitle ? `Job Details:
Position: ${jobTitle}
${jobCompany ? `Company: ${jobCompany}\n` : ''}${jobCity ? `City: ${jobCity}\n` : ''}` : ''}

Status: Application Withdrawn

You can view all applications in your Chickenloop recruiter dashboard.`;

  return { subject, html, text };
}

/**
 * Email: Welcome email for new user registration
 * Sent to: Newly registered user
 */
export interface WelcomeEmailData {
  userName?: string;
  dashboardUrl: string;
}

export function getWelcomeEmail(data: WelcomeEmailData): { subject: string; html: string; text: string } {
  const { userName, dashboardUrl } = data;
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  // Note: Welcome email uses dashboardUrl which is already role-specific
  // For the preferences link in the welcome email, we'll use a generic approach
  // Users can access preferences from their dashboard
  // Job-seekers: /job-seeker/account/edit
  // Recruiters: /recruiter/account/edit
  // Since dashboardUrl is already role-specific, derive preferences URL from it
  const preferencesUrl = dashboardUrl.includes('/recruiter')
    ? `${baseUrl}/recruiter/account/edit`
    : dashboardUrl.includes('/admin')
    ? `${baseUrl}/job-seeker/account/edit` // Admins can use job-seeker URL as fallback
    : `${baseUrl}/job-seeker/account/edit`; // Default for job-seekers

  const subject = 'Welcome to ChickenLoop';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb; margin-bottom: 20px;">Welcome to ChickenLoop!</h2>
      
      <p>Hello${userName ? ` ${userName}` : ''},</p>
      
      <p>Thank you for joining ChickenLoop! We're excited to have you on board.</p>

      <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
        <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
          <strong>What is ChickenLoop?</strong><br />
          ChickenLoop connects sports professionals with job opportunities. Whether you're looking for your next role in sports or recruiting talent for your organization, we're here to help you succeed.
        </p>
      </div>

      <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #374151; margin-top: 0;">Get Started</h3>
        <p style="margin: 0 0 10px 0; color: #4b5563;">
          Start exploring opportunities or managing your profile in your dashboard.
        </p>
        <div style="text-align: center; margin: 15px 0;">
          <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Go to Dashboard</a>
        </div>
      </div>

      <p style="margin-top: 30px; color: #6b7280; font-size: 12px; line-height: 1.5;">
        <strong>Email Preferences:</strong> You can manage your email notifications and preferences at any time from your account settings.
      </p>

      <p style="margin-top: 15px; color: #6b7280; font-size: 12px;">
        Welcome aboard!<br />
        The ChickenLoop Team
      </p>
    </div>
  `;

  const text = `Welcome to ChickenLoop!

Hello${userName ? ` ${userName}` : ''},

Thank you for joining ChickenLoop! We're excited to have you on board.

What is ChickenLoop?
ChickenLoop connects sports professionals with job opportunities. Whether you're looking for your next role in sports or recruiting talent for your organization, we're here to help you succeed.

Get Started
Start exploring opportunities or managing your profile in your dashboard.

Go to Dashboard: ${dashboardUrl}

Email Preferences: You can manage your email notifications and preferences at any time from your account settings.

Welcome aboard!
The ChickenLoop Team`;

  return { subject, html, text };
}

