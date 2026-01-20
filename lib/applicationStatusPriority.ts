/**
 * Application status priority for email suppression
 * Higher priority statuses take precedence when multiple status changes occur in the suppression window
 * 
 * Priority order: offered > interviewing > contacted > rejected
 */

export type ApplicationStatus = 
  | 'applied' 
  | 'viewed' 
  | 'contacted' 
  | 'interviewing' 
  | 'offered' 
  | 'hired' 
  | 'accepted' 
  | 'rejected' 
  | 'withdrawn';

/**
 * Status priority map
 * Higher number = higher priority
 */
const STATUS_PRIORITY: Record<ApplicationStatus, number> = {
  offered: 4,      // Highest priority
  interviewing: 3,
  contacted: 2,
  rejected: 1,
  // Statuses that don't trigger emails have priority 0
  applied: 0,
  viewed: 0,
  hired: 0,
  accepted: 0,
  withdrawn: 0,
};

/**
 * Get priority for a status
 * @param status - Application status
 * @returns Priority number (higher = more important)
 */
export function getStatusPriority(status: ApplicationStatus): number {
  return STATUS_PRIORITY[status] || 0;
}

/**
 * Compare two statuses and return the one with higher priority
 * @param status1 - First status
 * @param status2 - Second status
 * @returns Status with higher priority, or status1 if equal
 */
export function getHigherPriorityStatus(
  status1: ApplicationStatus,
  status2: ApplicationStatus
): ApplicationStatus {
  const priority1 = getStatusPriority(status1);
  const priority2 = getStatusPriority(status2);
  
  if (priority2 > priority1) {
    return status2;
  }
  return status1;
}

/**
 * Check if a status should trigger an email notification
 * @param status - Application status
 * @returns true if status should trigger email
 */
export function shouldNotifyStatus(status: ApplicationStatus): boolean {
  return getStatusPriority(status) > 0;
}

/**
 * Suppression window in milliseconds (30 minutes)
 */
export const STATUS_EMAIL_SUPPRESSION_WINDOW_MS = 30 * 60 * 1000;

/**
 * Check if status email should be suppressed based on suppression window
 * @param lastStatusEmailSentAt - Timestamp of last email sent (optional)
 * @param currentStatus - Current status to notify
 * @param lastStatusNotified - Last status that was notified (optional)
 * @returns Object with shouldSuppress flag and reason if suppressed
 */
export function shouldSuppressStatusEmail(
  lastStatusEmailSentAt: Date | undefined | null,
  currentStatus: ApplicationStatus,
  lastStatusNotified: string | undefined | null
): { shouldSuppress: boolean; reason?: string; higherPriorityStatus?: ApplicationStatus } {
  // If no previous email sent, don't suppress
  if (!lastStatusEmailSentAt) {
    return { shouldSuppress: false };
  }

  const now = new Date();
  const timeSinceLastEmail = now.getTime() - lastStatusEmailSentAt.getTime();

  // If outside suppression window, don't suppress
  if (timeSinceLastEmail >= STATUS_EMAIL_SUPPRESSION_WINDOW_MS) {
    return { shouldSuppress: false };
  }

  // Within suppression window - check priority
  if (lastStatusNotified) {
    const lastStatus = lastStatusNotified as ApplicationStatus;
    const lastPriority = getStatusPriority(lastStatus);
    const currentPriority = getStatusPriority(currentStatus);

    // If current status has higher priority, don't suppress (will replace)
    if (currentPriority > lastPriority) {
      return {
        shouldSuppress: false,
        higherPriorityStatus: currentStatus,
      };
    }

    // If current status has same or lower priority, suppress
    if (currentPriority <= lastPriority) {
      return {
        shouldSuppress: true,
        reason: `Suppressed: ${currentStatus} has lower or equal priority than ${lastStatus} (within ${Math.round(timeSinceLastEmail / 1000 / 60)} minute suppression window)`,
      };
    }
  }

  // If we don't know the last status, suppress if within window
  return {
    shouldSuppress: true,
    reason: `Suppressed: Within ${Math.round(timeSinceLastEmail / 1000 / 60)} minute suppression window`,
  };
}
