/**
 * Reference request timing.
 *
 * Phase 4 revisit criteria (use getReferenceFunnelStats / admin metrics):
 * - If pending >> confirmed after day 5 with low open/click rates → improve manager copy first.
 * - If opens are healthy but replies lag past day 10 → consider a second soft reminder
 *   (REFERENCE_SECOND_AUTO_REMIND_AFTER_MS) and REFERENCE_MAX_REMINDERS = 2.
 * - Expiry extended to 21 days to give seasonal managers more inbox time without more mail.
 */

/** Token / confirm-link lifetime. */
export const REFERENCE_EXPIRY_DAYS = 21;

/** Auto-remind manager after this long with no reply (first reminder). */
export const REFERENCE_AUTO_REMIND_AFTER_MS = 5 * 24 * 60 * 60 * 1000;

/**
 * Proposed second auto-remind delay (not enabled while MAX_REMINDERS is 1).
 * Enable only after measuring Phase 1–3 impact.
 */
export const REFERENCE_SECOND_AUTO_REMIND_AFTER_MS = 10 * 24 * 60 * 60 * 1000;

/** Seeker may manually remind after this long. */
export const REFERENCE_MANUAL_REMIND_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Max manager reminder emails per token (auto or manual).
 * Keep at 1 until funnel metrics justify a second reminder.
 */
export const REFERENCE_MAX_REMINDERS = 1;
