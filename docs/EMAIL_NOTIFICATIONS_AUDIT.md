# Email Notifications Audit

**Date:** 2025-01-XX  
**Scope:** Complete audit of all email notifications in the Chickenloop codebase  
**Method:** Read-only code analysis

---

## Executive Summary

This audit identifies **7 distinct email notification types** across **6 API routes** and **1 cron job**. All emails use **Resend** as the email service provider. Emails are sent **synchronously** within API request handlers (non-blocking error handling), with one exception: job alerts are sent via a **background cron job**.

### Key Findings

- ✅ **Email Service:** Resend (modern, transactional email API)
- ✅ **Error Handling:** All emails wrapped in try-catch, non-blocking
- ✅ **Templates:** Centralized in `lib/emailTemplates.ts`
- ⚠️ **Synchronous Sending:** All emails sent during API requests (except job alerts)
- ⚠️ **No Unsubscribe Links:** Missing in notification emails
- ⚠️ **No Email Preferences:** No user preference system for email frequency/type

---

## Email Service Configuration

### Service Provider
- **Service:** Resend (https://resend.com)
- **Implementation:** `lib/email.ts`
- **Client:** Resend SDK (`resend` package v4.8.0)
- **Configuration:**
  - API Key: `RESEND_API_KEY` (required, must start with `re_`)
  - From Email: `RESEND_FROM_EMAIL` (optional, defaults to `onboarding@resend.dev`)

### Email Function
- **Function:** `sendEmail(options: SendEmailOptions)`
- **Location:** `lib/email.ts:52`
- **Returns:** `{ success: boolean; messageId?: string; error?: string }`
- **Features:**
  - Supports HTML and/or text content
  - Optional reply-to, CC, BCC
  - Email tags for analytics
  - Graceful degradation if service not configured

---

## Email Notifications Inventory

### 1. Candidate Applied to Job

**Trigger:** Job seeker submits instant application  
**Action:** `POST /api/applications` (job-seeker role)  
**File:** `app/api/applications/route.ts:383`  
**Recipient:** Recruiter (owner of the job)  
**Template:** `getCandidateAppliedEmail()` from `lib/emailTemplates.ts:21`  
**Subject:** `"New Application: {candidateName} applied for {jobTitle}"`  
**Type:** Transactional notification  
**Conditions:**
- Only sent if `candidate`, `recruiter`, and `recruiter.email` exist
- Sent after successful application creation
- Non-blocking (errors logged, don't fail request)

**Email Tags:**
- `type: 'application'`
- `event: 'candidate_applied'`

**Notes:**
- Sent synchronously during API request
- No unsubscribe link
- Includes job details and candidate contact info

---

### 2. Application Status Changed

**Trigger:** Recruiter or admin updates application status  
**Action:** `PATCH /api/applications/[id]`  
**File:** `app/api/applications/[id]/route.ts:391`  
**Recipient:** Candidate (job seeker)  
**Template:** `getStatusChangedEmail()` from `lib/emailTemplates.ts:136`  
**Subject:** `"Application Update: {statusLabel} - {jobTitle}"`  
**Type:** Transactional notification  
**Conditions:**
- Only sent if status actually changed (`statusChanged === true`)
- Only sent for specific statuses: `['contacted', 'interviewing', 'offered', 'rejected']`
- **NOT sent for:** `viewed`, `applied`, `withdrawn`, `hired`
- Requires `candidate`, `recruiter`, and `candidate.email` to exist

**Email Tags:**
- `type: 'application'`
- `event: 'status_changed'`
- `status: {application.status}`

**Notes:**
- Sent synchronously during API request
- Includes dashboard link
- Status-specific messaging (neutral tone)
- Reply-to set to recruiter email

---

### 3. Recruiter Contacted Candidate

**Trigger:** Recruiter clicks "Contact Candidate" button  
**Action:** `POST /api/applications/[id]/contact`  
**File:** `app/api/applications/[id]/contact/route.ts:68`  
**Recipient:** Candidate (job seeker)  
**Template:** `getRecruiterContactedEmail()` from `lib/emailTemplates.ts:78`  
**Subject:** `"{recruiterName} from {jobCompany} is interested in your profile"`  
**Type:** Transactional notification  
**Conditions:**
- Requires recruiter role
- Application must belong to recruiter
- Requires `candidate`, `recruiter`, and `candidate.email` to exist
- If email fails, API returns 500 error (unlike other emails)

**Email Tags:**
- `type: 'application'`
- `event: 'recruiter_contacted'`
- `application_id: {id}`

**Notes:**
- Sent synchronously during API request
- Reply-to set to recruiter email
- Includes job details if available
- **Only email that fails the API request on error** (others are non-blocking)

---

### 4. Application Withdrawn by Candidate

**Trigger:** Job seeker withdraws their application  
**Action:** `POST /api/applications/[id]/withdraw`  
**File:** `app/api/applications/[id]/withdraw/route.ts:99`  
**Recipient:** Recruiter (owner of the job)  
**Template:** `getApplicationWithdrawnEmail()` from `lib/emailTemplates.ts:366`  
**Subject:** `"Application Withdrawn: {candidateName} withdrew from {jobTitle}"`  
**Type:** Transactional notification  
**Conditions:**
- Only sent if `recruiter`, `recruiter.email`, and `candidate` exist
- Sent after successful withdrawal
- Non-blocking (errors logged, don't fail request)

**Email Tags:**
- `type: 'application'`
- `event: 'application_withdrawn'`

**Notes:**
- Sent synchronously during API request
- No unsubscribe link
- Includes candidate and job details

---

### 5. Job Alert (Cron Job)

**Trigger:** Scheduled cron job (daily/weekly)  
**Action:** `GET /api/cron/job-alerts` (Vercel Cron)  
**File:** `app/api/cron/job-alerts/route.ts:108`  
**Recipient:** Job seekers with active saved searches  
**Template:** `getJobAlertEmail()` from `lib/emailTemplates.ts:261`  
**Subject:** `"New Jobs Matching '{searchName}' - {count} jobs found"`  
**Type:** Marketing/notification email  
**Conditions:**
- Only processes active saved searches (`active: true`)
- Skips searches with `frequency: 'never'`
- Daily: sends if never sent or last sent > 24 hours ago
- Weekly: sends if never sent or last sent > 7 days ago
- Sends even if no jobs found (to confirm search is active)
- Requires user with valid email

**Email Tags:**
- `type: 'job_alert'`
- `frequency: {search.frequency}`
- `job_count: {jobs.length}`

**Notes:**
- **Only email sent via background job** (not during API request)
- Sent asynchronously via Vercel Cron
- Includes unsubscribe note in footer (informational, not functional)
- Updates `lastSent` timestamp after successful send
- Processes all active searches in a single cron run

---

### 6. Contact Form Submission

**Trigger:** User submits contact/feedback form  
**Action:** `POST /api/contact`  
**File:** `app/api/contact/route.ts:49`  
**Recipient:** Platform support (`CONTACT_EMAIL` env var, defaults to `hello@chickenloop.com`)  
**Template:** Inline HTML (not using template function)  
**Subject:** `"Feedback from {name}"`  
**Type:** Transactional (support request)  
**Conditions:**
- Requires `name`, `email`, `message` fields
- Validates email format
- If email service not configured, logs submission and returns 503
- Reply-to set to submitter's email

**Email Tags:**
- `type: 'contact'`
- `source: 'contact-form'`

**Notes:**
- Sent synchronously during API request
- Not a notification to end users (internal support email)
- Includes HTML escaping for message content
- Falls back gracefully if email service unavailable

---

### 7. Test Email

**Trigger:** Admin/developer tests email configuration  
**Action:** `POST /api/email/test`  
**File:** `app/api/email/test/route.ts:45`  
**Recipient:** Specified email address  
**Template:** `sendTestEmail()` from `lib/email.ts:143`  
**Subject:** `"Test Email from Chickenloop"`  
**Type:** System/utility  
**Conditions:**
- Requires authentication
- Validates email format
- Checks if email service is configured

**Notes:**
- Utility endpoint for testing, not a user-facing notification
- Includes timestamp and from address in email body

---

## Summary Table

| # | Trigger | Action / Event | Recipient | Email Purpose | File / Route | Notes |
|---|---------|---------------|-----------|--------------|--------------|-------|
| 1 | Job seeker applies | Instant application submitted | Recruiter | New application notification | `POST /api/applications` | Synchronous, non-blocking |
| 2 | Status updated | Application status changed | Candidate | Status update notification | `PATCH /api/applications/[id]` | Only for: contacted, interviewing, offered, rejected |
| 3 | Recruiter contacts | "Contact Candidate" clicked | Candidate | Recruiter interest notification | `POST /api/applications/[id]/contact` | **Fails API on error** (unlike others) |
| 4 | Candidate withdraws | Application withdrawn | Recruiter | Withdrawal notification | `POST /api/applications/[id]/withdraw` | Synchronous, non-blocking |
| 5 | Cron job (daily/weekly) | Job alert scheduled | Job seeker | Job matching alert | `GET /api/cron/job-alerts` | **Only background job**, sends even if no jobs |
| 6 | Contact form | Feedback submitted | Support team | Support request | `POST /api/contact` | Internal email, not user notification |
| 7 | Admin test | Email test endpoint | Specified email | Configuration test | `POST /api/email/test` | Utility endpoint, not user-facing |

---

## Observations and Flags

### ⚠️ Critical Observations

1. **No Unsubscribe Links**
   - All notification emails lack unsubscribe functionality
   - Job alert email mentions unsubscribe in footer but no functional link
   - **Risk:** Potential compliance issues (GDPR, CAN-SPAM)

2. **Synchronous Email Sending**
   - 6 out of 7 emails sent synchronously during API requests
   - **Risk:** Slower API response times, potential timeout issues
   - **Exception:** Job alerts sent via background cron job (best practice)

3. **No Email Preferences**
   - No user preference system for email frequency or type
   - Users cannot opt-out of specific notification types
   - **Risk:** User experience, potential spam complaints

4. **Inconsistent Error Handling**
   - Most emails: non-blocking (errors logged, request succeeds)
   - Contact email: **blocks request on failure** (returns 500)
   - **Risk:** Inconsistent user experience

### 📋 Missing Confirmations

1. **User Registration**
   - No welcome email sent on registration
   - No email verification/confirmation
   - **File:** `app/api/auth/register/route.ts` (no email code found)

2. **Password Reset**
   - No password reset email functionality found
   - **Risk:** Users cannot recover accounts

3. **Email Change**
   - No email change confirmation found
   - **Risk:** Security concern

4. **Job Posted**
   - No confirmation email to recruiter when job is posted
   - **Risk:** No confirmation of successful job posting

### 🔄 Duplicate Risk

1. **Status Change Emails**
   - Status change email sent on `PATCH /api/applications/[id]`
   - Contact email sent on `POST /api/applications/[id]/contact`
   - **Risk:** If recruiter contacts AND changes status to "contacted", candidate may receive 2 emails
   - **Mitigation:** Status change only triggers for specific statuses, contact is separate action

2. **Application Creation**
   - Application created via `POST /api/applications` sends email to recruiter
   - **Risk:** If application created multiple times (duplicate prevention exists in code)

### 🏗️ Architecture Observations

1. **Email Templates**
   - ✅ Centralized in `lib/emailTemplates.ts`
   - ✅ Consistent styling and structure
   - ✅ Both HTML and text versions provided
   - ✅ Status-specific messaging

2. **Email Service**
   - ✅ Modern service (Resend)
   - ✅ Graceful degradation if not configured
   - ✅ Tagging for analytics
   - ✅ Reply-to support where appropriate

3. **Error Handling**
   - ✅ Most emails wrapped in try-catch
   - ✅ Non-blocking (except contact email)
   - ✅ Errors logged to console
   - ⚠️ No error tracking/monitoring system

4. **Background Jobs**
   - ✅ Job alerts use cron job (best practice)
   - ✅ Proper authentication via `CRON_SECRET`
   - ✅ Processes all searches in batch
   - ✅ Updates `lastSent` timestamp

### 📊 Email Volume Estimates

- **High Volume:** Job alerts (cron job, all active searches)
- **Medium Volume:** Application notifications (per application)
- **Low Volume:** Contact form, test emails

---

## Recommendations (Observations Only)

### High Priority

1. **Add Unsubscribe Functionality**
   - Add unsubscribe links to all notification emails
   - Implement unsubscribe endpoint
   - Store user preferences in database

2. **Implement Email Preferences**
   - Allow users to control email frequency/types
   - Add preference management UI
   - Respect preferences before sending

3. **Standardize Error Handling**
   - Make contact email non-blocking (consistent with others)
   - Or make all emails blocking (if critical)
   - Add error monitoring/alerting

### Medium Priority

4. **Move to Background Jobs**
   - Consider moving application emails to background queue
   - Use job queue (e.g., Bull, BullMQ) for async processing
   - Improve API response times

5. **Add Missing Confirmations**
   - Welcome email on registration
   - Email verification
   - Password reset functionality
   - Job posting confirmation

### Low Priority

6. **Email Analytics**
   - Track open rates, click rates
   - Monitor bounce rates
   - Use Resend analytics if available

7. **Email Testing**
   - Add email preview functionality
   - Test emails in different clients
   - Verify mobile rendering

---

## Files Referenced

### Core Email Infrastructure
- `lib/email.ts` - Email sending function
- `lib/emailTemplates.ts` - Email templates

### API Routes with Email
- `app/api/applications/route.ts` - Application creation/contact
- `app/api/applications/[id]/route.ts` - Status updates
- `app/api/applications/[id]/contact/route.ts` - Recruiter contact
- `app/api/applications/[id]/withdraw/route.ts` - Application withdrawal
- `app/api/contact/route.ts` - Contact form
- `app/api/cron/job-alerts/route.ts` - Job alerts cron job
- `app/api/email/test/route.ts` - Test email endpoint

### Configuration
- `package.json` - Dependencies (resend, nodemailer)
- Environment variables: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CONTACT_EMAIL`, `CRON_SECRET`

---

## Conclusion

The email notification system is **well-structured** with centralized templates and consistent error handling. However, there are **compliance and user experience gaps** that should be addressed:

1. Missing unsubscribe functionality
2. No email preferences system
3. Most emails sent synchronously (performance concern)
4. Missing confirmation emails for key actions

The system is **production-ready** but would benefit from the recommendations above to improve compliance, user experience, and performance.

---

**End of Audit**
