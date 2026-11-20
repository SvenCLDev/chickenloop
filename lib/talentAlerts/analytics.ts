type TalentAlertAnalyticsEvent =
  | 'talent_search_saved'
  | 'talent_search_edited'
  | 'talent_search_deleted'
  | 'talent_alert_email_sent'
  | 'talent_alert_email_failed'
  | 'favourite_availability_alert_sent';

/**
 * Lightweight product analytics for Talent Alerts (console + optional gtag).
 */
export function trackTalentAlertAnalytics(
  event: TalentAlertAnalyticsEvent,
  payload: Record<string, unknown> = {}
): void {
  console.log(`[TalentAlertAnalytics] ${event}`, payload);
  if (typeof window !== 'undefined') {
    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    if (typeof gtag === 'function') {
      gtag('event', event, payload);
    }
  }
}
