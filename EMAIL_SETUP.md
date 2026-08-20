# Email Setup Guide

This project uses [Resend](https://resend.com) for transactional emails. Resend is a modern email API that's easy to set up and provides excellent deliverability.

## Setup Instructions

### 1. Create a Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account (100 emails/day free tier)
3. Verify your email address

### 2. Get Your API Key

1. Navigate to [API Keys](https://resend.com/api-keys) in your Resend dashboard
2. Click "Create API Key"
3. Give it a name (e.g., "Chickenloop Production")
4. Copy the API key (starts with `re_`)

### 3. Configure Domain (Optional but Recommended)

For production, you should verify your own domain:

1. Go to [Domains](https://resend.com/domains) in your Resend dashboard
2. Click "Add Domain"
3. Follow the DNS configuration instructions
4. Once verified, update `RESEND_FROM_EMAIL` in your environment variables

### 4. Set Environment Variables

Add the following to your `.env.local` file:

```env
# Resend Email Configuration
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com  # Optional, defaults to onboarding@resend.dev
RESEND_FROM_NAME=Chickenloop  # Optional display name in inbox (avoids showing "noreply")

# Reference verification emails (managers confirming work experience)
RESEND_REFERENCE_FROM_NAME=Chickenloop References  # Optional; default in code if unset
RESEND_REFERENCE_FROM_EMAIL=references@notifications.chickenloop.com  # Optional; falls back to RESEND_FROM_EMAIL
RESEND_REPLY_TO_EMAIL=hello@chickenloop.com  # Reply-To for reference emails
CONTACT_EMAIL=hello@chickenloop.com  # Used as Reply-To fallback
```

**Display name:** If `RESEND_FROM_NAME` is set, all transactional emails show that name instead of the local-part of the address (e.g. "noreply"). Reference emails use `RESEND_REFERENCE_FROM_NAME` when set.

**For Vercel Production:**
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `RESEND_FROM_NAME` (recommended)
4. Deploy to apply changes

## Testing Email Configuration

### Using the Test API Endpoint

1. Make sure you're authenticated (logged in)
2. Send a POST request to `/api/email/test`:

```bash
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -H "Cookie: token=your_auth_token" \
  -d '{"email": "your-email@example.com"}'
```

Or check if email is configured:

```bash
curl http://localhost:3000/api/email/test \
  -H "Cookie: token=your_auth_token"
```

### Using the Email Utility

```typescript
import { sendEmail, sendTestEmail } from '@/lib/email';

// Send a test email
const result = await sendTestEmail('recipient@example.com');

// Send a custom email
const result = await sendEmail({
  to: 'recipient@example.com',
  subject: 'Welcome to Chickenloop',
  html: '<h1>Welcome!</h1><p>Thanks for joining.</p>',
  text: 'Welcome! Thanks for joining.',
});
```

## Email Utility Functions

### `sendEmail(options)`

Send a transactional email.

**Options:**
- `to`: string | string[] - Recipient email address(es)
- `subject`: string - Email subject
- `html`: string (optional) - HTML content
- `text`: string (optional) - Plain text content (required if html not provided)
- `from`: string (optional) - Sender email (defaults to RESEND_FROM_EMAIL)
- `replyTo`: string (optional) - Reply-to address
- `cc`: string | string[] (optional) - CC recipients
- `bcc`: string | string[] (optional) - BCC recipients
- `tags`: Array<{ name: string; value: string }> (optional) - Email tags for tracking

**Returns:**
```typescript
{
  success: boolean;
  messageId?: string;
  error?: string;
}
```

### `sendTestEmail(to)`

Send a test email to verify configuration.

**Parameters:**
- `to`: string - Recipient email address

**Returns:** Same as `sendEmail`

### `isEmailConfigured()`

Check if email service is configured.

**Returns:** `boolean`

## Example Usage

### Welcome Email

```typescript
import { sendEmail } from '@/lib/email';

await sendEmail({
  to: user.email,
  subject: 'Welcome to Chickenloop!',
  html: `
    <h1>Welcome, ${user.name}!</h1>
    <p>Thanks for joining Chickenloop. We're excited to have you!</p>
  `,
  text: `Welcome, ${user.name}! Thanks for joining Chickenloop.`,
});
```

### Application Notification

```typescript
import { sendEmail } from '@/lib/email';

await sendEmail({
  to: recruiter.email,
  subject: 'New Job Application',
  html: `
    <h2>New Application Received</h2>
    <p>You have received a new application for: <strong>${job.title}</strong></p>
    <p>Candidate: ${candidate.name}</p>
    <a href="${applicationUrl}">View Application</a>
  `,
  replyTo: candidate.email,
  tags: [
    { name: 'type', value: 'application' },
    { name: 'jobId', value: job.id },
  ],
});
```

## Troubleshooting

### "Email service is not configured"

- Make sure `RESEND_API_KEY` is set in your environment variables
- Restart your development server after adding environment variables
- For production, ensure variables are set in Vercel

### Emails not being received

- Check your Resend dashboard for delivery status
- Verify your domain is properly configured (if using custom domain)
- Check spam/junk folder
- Ensure recipient email is valid

### API Key Issues

- Verify the API key starts with `re_`
- Check that the API key is active in your Resend dashboard
- Ensure you haven't exceeded your rate limits

## Contact Form

The contact form (`/api/contact`) has been migrated to use Resend. It sends feedback emails to the address specified in `CONTACT_EMAIL` environment variable (defaults to `hello@chickenloop.com`).

### Environment Variable

```env
CONTACT_EMAIL=hello@chickenloop.com  # Optional, defaults to hello@chickenloop.com
```

## Migration from Nodemailer

The contact form has been migrated to Resend. If you have other code using Nodemailer:

1. Update to use `sendEmail` from `@/lib/email`
2. Remove SMTP environment variables if no longer needed
3. The `nodemailer` package can be removed from dependencies if not used elsewhere

## Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Resend Dashboard](https://resend.com/overview)

