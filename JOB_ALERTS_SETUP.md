# Job Search Alerts Setup Guide

This document explains how to set up and use the saved job search alerts feature.

## Overview

Job seekers can save their search criteria and receive email alerts when new jobs matching their criteria are posted. Alerts can be sent daily or weekly.

## Features

- **Save Search Criteria**: Users can save filters including:
  - Keyword (searches in title, description, company)
  - Location
  - Country
  - Category (occupational areas)
  - Sport/Activity
  - Language

- **Email Frequency**: Choose between daily or weekly alerts

- **Automatic Matching**: System automatically matches new jobs against saved searches

- **Email Notifications**: Users receive formatted emails with matching jobs

## API Endpoints

### GET `/api/saved-searches`
Get all saved searches for the current user.

**Authentication**: Required

**Response**:
```json
{
  "savedSearches": [
    {
      "_id": "...",
      "userId": "...",
      "name": "Kitesurfing in Spain",
      "keyword": "kitesurf",
      "location": "Spain",
      "country": "ES",
      "frequency": "daily",
      "active": true,
      "lastSent": "2024-01-15T09:00:00.000Z",
      "createdAt": "2024-01-10T10:00:00.000Z"
    }
  ]
}
```

### POST `/api/saved-searches`
Create a new saved search.

**Authentication**: Required

**Request Body**:
```json
{
  "name": "Kitesurfing in Spain",  // Optional
  "keyword": "kitesurf",
  "location": "Spain",
  "country": "ES",
  "category": "Instructor",
  "sport": "Kitesurfing",
  "language": "English",
  "frequency": "daily"  // or "weekly"
}
```

**Response**:
```json
{
  "message": "Saved search created successfully",
  "savedSearch": { ... }
}
```

### PATCH `/api/saved-searches/[id]`
Update a saved search.

**Authentication**: Required

**Request Body** (all fields optional):
```json
{
  "name": "Updated name",
  "active": false,
  "frequency": "weekly"
}
```

### DELETE `/api/saved-searches/[id]`
Delete a saved search.

**Authentication**: Required

## Cron Job Configuration

The job alerts are sent via a Vercel Cron job that runs daily at 9:00 AM UTC.

### Vercel Configuration

The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/job-alerts",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### Environment Variables

Add the following to your Vercel environment variables:

```env
CRON_SECRET=your-secret-key-here  # Used to secure the cron endpoint
NEXT_PUBLIC_BASE_URL=https://chickenloop.com  # Base URL for job links in emails
```

**Important**: 
- Set `CRON_SECRET` to a random secure string
- The cron endpoint checks this secret to prevent unauthorized access
- Update `NEXT_PUBLIC_BASE_URL` to your production domain

### How It Works

1. **Daily Processing**: The cron job runs once per day at 9:00 AM UTC
2. **Frequency Check**:
   - **Daily alerts**: Sent if last sent more than 24 hours ago
   - **Weekly alerts**: Sent if last sent more than 7 days ago
3. **Job Matching**: For each active saved search:
   - Finds jobs created since `lastSent` (or last 24 hours/week if never sent)
   - Applies all saved filters to match jobs
   - Sends email with matching jobs
4. **Email Sending**: Uses Resend to send formatted HTML emails
5. **Tracking**: Updates `lastSent` timestamp after successful email

### Manual Testing

You can manually trigger the cron job for testing:

```bash
curl -X GET https://your-domain.com/api/cron/job-alerts \
  -H "Authorization: Bearer your-cron-secret"
```

Or test locally (requires CRON_SECRET in .env.local):

```bash
curl -X GET http://localhost:3000/api/cron/job-alerts \
  -H "Authorization: Bearer your-cron-secret"
```

## Email Template

The job alert emails include:
- Personalized greeting
- Number of matching jobs
- List of jobs with:
  - Job title (linked)
  - Company name
  - Location
  - Job type
  - Posting date
  - Job description preview
  - "View Job" button
- Featured jobs are highlighted
- Link to manage saved searches

## Database Schema

The `SavedSearch` model includes:
- `userId`: Reference to User
- `name`: Optional name for the search
- `keyword`, `location`, `country`, `category`, `sport`, `language`: Filter criteria
- `frequency`: 'daily' or 'weekly'
- `active`: Boolean to enable/disable alerts
- `lastSent`: Timestamp of last email sent
- `createdAt`, `updatedAt`: Timestamps

## Frontend Integration

To integrate saved searches in the frontend:

1. **Create Saved Search**: After user applies filters, offer "Save Search" button
2. **List Saved Searches**: Show user's saved searches in dashboard
3. **Manage Searches**: Allow users to edit, activate/deactivate, or delete searches
4. **Visual Feedback**: Show when last alert was sent

Example API calls:

```typescript
// Create saved search
const response = await fetch('/api/saved-searches', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    name: 'My Search',
    keyword: 'instructor',
    location: 'Spain',
    frequency: 'daily',
  }),
});

// Get all saved searches
const { savedSearches } = await fetch('/api/saved-searches', {
  credentials: 'include',
}).then(r => r.json());

// Update saved search
await fetch(`/api/saved-searches/${searchId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ active: false }),
});

// Delete saved search
await fetch(`/api/saved-searches/${searchId}`, {
  method: 'DELETE',
  credentials: 'include',
});
```

## Troubleshooting

### Emails Not Sending

1. Check that `CRON_SECRET` is set in Vercel environment variables
2. Verify Resend API key is configured (`RESEND_API_KEY`)
3. Check Vercel cron job logs in dashboard
4. Ensure saved searches are marked as `active: true`
5. Verify user email addresses are valid

### Jobs Not Matching

1. Check that job matching logic matches frontend filtering
2. Verify saved search filters are correctly stored
3. Check that jobs are marked as `published: true`
4. Review cron job logs for matching details

### Cron Job Not Running

1. Verify `vercel.json` is committed and deployed
2. Check Vercel cron configuration in dashboard
3. Ensure cron endpoint returns 200 status
4. Check Vercel function logs for errors

## Future Enhancements

Potential improvements:
- Real-time alerts (webhooks)
- More granular frequency options (e.g., twice weekly)
- Email preferences (digest vs individual emails)
- Unsubscribe links in emails
- Search analytics (how many matches per search)
- Duplicate detection (don't send same job twice)




