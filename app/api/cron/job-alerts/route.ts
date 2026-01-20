import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SavedSearch from '@/models/SavedSearch';
import User from '@/models/User';
import { findMatchingJobs } from '@/lib/jobMatching';
import { sendEmail, EmailCategory } from '@/lib/email';
import { getJobAlertEmail, getJobAlertHeartbeatEmail } from '@/lib/emailTemplates';

/**
 * Vercel Cron Job: Send job alerts
 * 
 * This endpoint is called by Vercel Cron (configured in vercel.json)
 * It runs daily and sends job alerts to users with active saved searches
 * 
 * For weekly alerts, we check if 7 days have passed since lastSent
 */
export async function GET(request: NextRequest) {
  // Verify this is a cron request (Vercel adds Authorization header)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    console.log('[Cron Job Alerts] Starting job alert processing...');

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Find all active saved searches that need to be processed
    const savedSearches = await SavedSearch.find({ active: true }).lean() as any[];

    console.log(`[Cron Job Alerts] Found ${savedSearches.length} active saved searches`);

    // Track users who have received job alerts in the last 24 hours (hard cap)
    const userLastAlertSent = new Map<string, Date>();
    // Track job alert counts per user in this cron run (safety check)
    const jobAlertCountsInRun = new Map<string, number>();

    let processed = 0;
    let emailsSent = 0;
    let heartbeatSent = 0;
    let suppressed = 0;
    let errors = 0;

    for (const search of savedSearches) {
      try {
        // Skip searches with frequency "never"
        if (search.frequency === 'never') {
          console.log(`[Cron Job Alerts] Skipping search ${search._id}: frequency is "never"`);
          continue;
        }

        // Determine if this search should be processed
        let shouldProcess = false;
        let sinceDate: Date | undefined;

        if (search.frequency === 'daily') {
          // Daily: send if never sent, or last sent more than 24 hours ago
          if (!search.lastSent || search.lastSent < oneDayAgo) {
            shouldProcess = true;
            sinceDate = search.lastSent || oneDayAgo;
          }
        } else if (search.frequency === 'weekly') {
          // Weekly: send if never sent, or last sent more than 7 days ago
          if (!search.lastSent || search.lastSent < oneWeekAgo) {
            shouldProcess = true;
            sinceDate = search.lastSent || oneWeekAgo;
          }
        }

        if (!shouldProcess) {
          continue;
        }

        processed++;

        // Get user info
        const user = await User.findById(search.userId).select('name email').lean();
        if (!user || !user.email) {
          console.warn(`[Cron Job Alerts] User not found or no email for search ${search._id}`);
          continue;
        }

        // Check 24-hour hard cap: max 1 job alert per user per 24 hours
        const userIdStr = user._id.toString();
        const userLastSent = userLastAlertSent.get(userIdStr);
        if (userLastSent && userLastSent > oneDayAgo) {
          suppressed++;
          console.log(
            `[Cron Job Alerts] Suppressed: User ${userIdStr} already received job alert in last 24 hours ` +
            `(last sent: ${userLastSent.toISOString()})`
          );
          continue;
        }

        // Safety check: Assert job alert cap enforcement
        // This prevents accidental multiple job alerts in one cron run
        const jobAlertsSentToUser = jobAlertCountsInRun.get(userIdStr) || 0;
        if (jobAlertsSentToUser >= 1) {
          console.error(
            `[Email Safety Violation] Multiple job alerts attempted for user in single cron run: ` +
            `userId=${userIdStr}, count=${jobAlertsSentToUser + 1}. ` +
            `This should never happen - check for duplicate job alert logic.`
          );
          suppressed++;
          continue;
        }

        // Find matching jobs
        const matches = await findMatchingJobs(search, sinceDate);

        console.log(`[Cron Job Alerts] Search ${search._id}: Found ${matches.length} matching jobs`);

        // Stop sending emails when job count is zero
        if (matches.length === 0) {
          suppressed++;
          console.log(
            `[Cron Job Alerts] Suppressed: Search ${search._id} has zero matching jobs. ` +
            `Skipping email (will send heartbeat if needed).`
          );
          
          // Check if heartbeat email should be sent (monthly)
          const shouldSendHeartbeat = !search.lastHeartbeatSent || search.lastHeartbeatSent < oneMonthAgo;
          if (shouldSendHeartbeat) {
            try {
              const heartbeatTemplate = getJobAlertHeartbeatEmail({
                userName: user.name,
                userEmail: user.email,
                searchName: search.name,
              });

              const heartbeatResult = await sendEmail({
                to: user.email,
                subject: heartbeatTemplate.subject,
                html: heartbeatTemplate.html,
                text: heartbeatTemplate.text,
                category: EmailCategory.USER_NOTIFICATION,
                eventType: 'job_alert_heartbeat',
                userId: userIdStr,
                tags: [
                  { name: 'type', value: 'job_alert' },
                  { name: 'subtype', value: 'heartbeat' },
                  { name: 'search_id', value: String(search._id) },
                ],
              });

              if (heartbeatResult.success) {
                heartbeatSent++;
                await SavedSearch.findByIdAndUpdate(search._id, {
                  lastHeartbeatSent: now,
                });
                console.log(
                  `[Cron Job Alerts] Heartbeat email sent to ${user.email} for search ${search._id}`
                );
              }
            } catch (heartbeatError) {
              console.error(
                `[Cron Job Alerts] Failed to send heartbeat email to ${user.email}:`,
                heartbeatError
              );
            }
          }
          continue;
        }

        // Prepare jobs for email
        const jobsForEmail = matches.map((match) => ({
          _id: String(match.job._id),
          title: match.job.title,
          company: match.job.company,
          city: match.job.city,
          country: match.job.country || undefined,
          description: match.job.description || '',
          type: match.job.type,
          featured: match.job.featured || false,
          createdAt: match.job.createdAt,
          url: `${process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://chickenloop.com')}/jobs/${match.job._id}`,
        }));

        // Send email with jobs
        const emailTemplate = getJobAlertEmail({
          userName: user.name,
          userEmail: user.email,
          searchName: search.name,
          jobs: jobsForEmail,
          frequency: search.frequency,
        });

        const emailResult = await sendEmail({
          to: user.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
          category: EmailCategory.USER_NOTIFICATION,
          eventType: 'job_alert',
          userId: userIdStr,
          tags: [
            { name: 'type', value: 'job_alert' },
            { name: 'frequency', value: search.frequency },
            { name: 'job_count', value: String(jobsForEmail.length) },
          ],
        });

        if (emailResult.success) {
          emailsSent++;
          // Update lastSent timestamp
          await SavedSearch.findByIdAndUpdate(search._id, {
            lastSent: now,
          });
          // Track user's last alert sent (for 24-hour hard cap)
          userLastAlertSent.set(userIdStr, now);
          // Track job alert count in this run (safety check)
          jobAlertCountsInRun.set(userIdStr, (jobAlertCountsInRun.get(userIdStr) || 0) + 1);
          console.log(
            `[Cron Job Alerts] Email sent to ${user.email} for search ${search._id} ` +
            `(${jobsForEmail.length} jobs)`
          );
        } else {
          errors++;
          console.error(`[Cron Job Alerts] Failed to send email to ${user.email}:`, emailResult.error);
        }
      } catch (error: unknown) {
        errors++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Cron Job Alerts] Error processing search ${search._id}:`, errorMessage);
      }
    }

    const summary = {
      message: 'Job alerts processed',
      totalSearches: savedSearches.length,
      processed,
      emailsSent,
      heartbeatSent,
      suppressed,
      errors,
      timestamp: now.toISOString(),
    };

    console.log('[Cron Job Alerts] Processing complete:', summary);

    return NextResponse.json(summary, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron Job Alerts] Fatal error:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

