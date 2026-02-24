# Vercel Environment Variables Setup

## Required for Email Functionality

### 1. RESEND_API_KEY (REQUIRED)
**Purpose**: Resend API key for sending emails

**How to get it**:
1. Go to https://resend.com/api-keys
2. Click "Create API Key"
3. Give it a name (e.g., "Chickenloop Production")
4. Copy the key (starts with `re_`)

**How to add in Vercel**:
1. Go to your Vercel project dashboard
2. Click on **Settings** → **Environment Variables**
3. Click **Add New**
4. Enter:
   - **Key**: `RESEND_API_KEY`
   - **Value**: Paste your API key **without quotes** (just the key itself: `re_Tr4zB7CP_KhT1mGDxpM6RQ4KLNxXx2BsM`)
   - **Environment**: Select **Production** (and **Preview** if you want it in preview deployments)
5. Click **Save**
6. **Important**: Redeploy your application for the variable to take effect

**⚠️ Common Mistakes:**
- ❌ Don't add quotes around the value: `"re_Tr4zB7CP..."`
- ❌ Don't add spaces before/after the key
- ❌ Don't include `RESEND_API_KEY=` prefix
- ✅ Just paste the key directly: `re_Tr4zB7CP_KhT1mGDxpM6RQ4KLNxXx2BsM`

**If deployment still fails:**
1. **Regenerate the API key** in Resend dashboard (old key might be invalid)
2. **Copy the new key** carefully (no extra characters)
3. **Delete the old variable** in Vercel and add it again
4. **Redeploy** after adding

### 2. RESEND_FROM_EMAIL (RECOMMENDED)
**Purpose**: Email address to send from (should match your verified domain)

**Value**: `noreply@notifications.chickenloop.com` (or your verified domain)

**How to add**: Same process as above, use key `RESEND_FROM_EMAIL`

### 3. CONTACT_EMAIL (OPTIONAL)
**Purpose**: Where contact form submissions are sent

**Default**: `hello@chickenloop.com` (if not set)

**How to add**: Same process as above, use key `CONTACT_EMAIL`

## Required for Job Alerts Cron Job

### 4. CRON_SECRET (REQUIRED for cron job)
**Purpose**: Secret key to secure the cron endpoint

**How to generate**:
```bash
openssl rand -hex 32
```

Or use any random secure string.

**How to add**: Same process as above, use key `CRON_SECRET`

### 5. NEXT_PUBLIC_BASE_URL (OPTIONAL)
**Purpose**: Base URL for job links in emails

**Value**: `https://chickenloop.com` (or your production domain)

**How to add**: Same process as above, use key `NEXT_PUBLIC_BASE_URL`

## Verification Steps

After adding environment variables:

1. **Redeploy** your application (required for new env vars to take effect)
2. **Test the contact form** - should work without the error
3. **Check Vercel logs** - look for any email-related errors
4. **Test email endpoint** (if authenticated):
   ```bash
   curl -X POST https://your-domain.com/api/email/test \
     -H "Content-Type: application/json" \
     -H "Cookie: token=your_auth_token" \
     -d '{"email": "your-email@example.com"}'
   ```

## Troubleshooting

### Error persists after adding RESEND_API_KEY

1. **Did you redeploy?** Environment variables only take effect after redeployment
2. **Check the environment**: Make sure you added it for **Production** environment
3. **Check the key name**: Must be exactly `RESEND_API_KEY` (case-sensitive)
4. **Check Vercel logs**: Look for any errors during deployment
5. **Verify the key**: Make sure the API key is valid and active in Resend dashboard

### How to verify environment variables are set

You can temporarily add a debug endpoint to check (local/dev only; never expose in production):

```typescript
// app/api/debug/env/route.ts (temporary, remove after debugging)
// SECURITY: Do not expose RESEND_API_KEY or its length. Never commit this route.
export async function GET() {
  return Response.json({
    hasResendKey: !!process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL || 'not set',
  });
}
```

**Note**: Remove this endpoint after debugging. Do not expose `resendKeyLength` or any key-related info to clients.

## Quick Checklist

- [ ] `RESEND_API_KEY` added to Vercel (Production environment)
- [ ] Application redeployed after adding variables
- [ ] `RESEND_FROM_EMAIL` added (recommended)
- [ ] `CRON_SECRET` added (if using job alerts)
- [ ] Contact form tested and working

