/**
 * Application Status Transition Rules
 * 
 * Defines allowed status transitions for the ATS workflow.
 * Terminal states (rejected, withdrawn, hired) cannot be transitioned from.
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
 * Terminal states that cannot be transitioned from
 */
export const TERMINAL_STATES: ApplicationStatus[] = ['rejected', 'withdrawn', 'hired'];

/**
 * Allowed status transitions map
 * Key: current status
 * Value: array of statuses that can be transitioned to from the current status
 */
export const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  // Initial application state
  applied: ['viewed', 'withdrawn', 'rejected'],
  
  // After recruiter views
  viewed: ['contacted', 'rejected', 'withdrawn'],
  
  // After recruiter contacts candidate
  contacted: ['interviewing', 'rejected'],
  
  // During interview process
  interviewing: ['offered', 'rejected'],
  
  // After offer is extended
  offered: ['hired', 'rejected'],
  
  // Terminal states - no transitions allowed
  hired: [],
  rejected: [],
  withdrawn: [],
  
  // Legacy status - kept for backward compatibility
  // Maps to similar workflow as "offered"
  accepted: ['hired', 'rejected'],
};

/**
 * Check if a status transition is allowed
 * @param fromStatus Current status
 * @param toStatus Desired new status
 * @returns true if transition is allowed, false otherwise
 */
export function isTransitionAllowed(
  fromStatus: ApplicationStatus,
  toStatus: ApplicationStatus
): boolean {
  // Same status is always allowed (no-op)
  if (fromStatus === toStatus) {
    return true;
  }

  // Cannot transition from terminal states
  if (TERMINAL_STATES.includes(fromStatus)) {
    return false;
  }

  // Check if transition is in the allowed list
  const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

/**
 * Get all allowed transitions from a given status
 * @param fromStatus Current status
 * @returns Array of statuses that can be transitioned to
 */
export function getAllowedTransitions(fromStatus: ApplicationStatus): ApplicationStatus[] {
  return ALLOWED_TRANSITIONS[fromStatus] || [];
}

/**
 * Validate a status transition and return error message if invalid
 * @param fromStatus Current status
 * @param toStatus Desired new status
 * @returns Error message if invalid, null if valid
 */
export function validateTransition(
  fromStatus: ApplicationStatus,
  toStatus: ApplicationStatus
): string | null {
  // Same status is always valid (no-op)
  if (fromStatus === toStatus) {
    return null;
  }

  // Check if current status is terminal
  if (TERMINAL_STATES.includes(fromStatus)) {
    return `Cannot change status from "${fromStatus}". Applications in terminal states (${TERMINAL_STATES.join(', ')}) cannot be modified.`;
  }

  // Check if transition is allowed
  if (!isTransitionAllowed(fromStatus, toStatus)) {
    const allowed = getAllowedTransitions(fromStatus);
    const allowedList = allowed.length > 0 
      ? allowed.map(s => `"${s}"`).join(', ')
      : 'none (this is a terminal state)';
    
    return `Invalid status transition from "${fromStatus}" to "${toStatus}". Allowed transitions from "${fromStatus}" are: ${allowedList}.`;
  }

  return null;
}

/**
 * Get a human-readable description of the status transition rules
 * @param fromStatus Current status
 * @returns Description of allowed transitions
 */
export function getTransitionDescription(fromStatus: ApplicationStatus): string {
  if (TERMINAL_STATES.includes(fromStatus)) {
    return `Status "${fromStatus}" is a terminal state and cannot be changed.`;
  }

  const allowed = getAllowedTransitions(fromStatus);
  if (allowed.length === 0) {
    return `No transitions allowed from "${fromStatus}".`;
  }

  return `From "${fromStatus}", you can transition to: ${allowed.map(s => `"${s}"`).join(', ')}.`;
}
