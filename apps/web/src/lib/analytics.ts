/**
 * Minimal event recording.
 *
 * P1-US-104 requires WhatsApp clicks to be recorded as an analytics event, and
 * P1-US-105 will use that count as the evidence for whether a real checkout is
 * worth building. No analytics provider has been chosen yet, so events are posted
 * to our own endpoint and written to the structured log.
 *
 * Deliberately not stored in Postgres: an unbounded event table on a 500 MB
 * database is a slow leak, and the count is only needed in aggregate.
 *
 * `sendBeacon` is used where available so the request survives the page unloading
 * as the user leaves for WhatsApp.
 */
export type AnalyticsEvent = 'whatsapp_click';

export function trackEvent(event: AnalyticsEvent, properties: Record<string, string> = {}): void {
  const body = JSON.stringify({ event, properties });

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }));
      return;
    }

    void fetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch (error) {
    // Analytics must never break a user action — the WhatsApp link still navigates.
    console.warn('[analytics] event not recorded', {
      event,
      message: error instanceof Error ? error.message : 'unknown error',
    });
  }
}
