/**
 * POST /api/events — records a product analytics event.
 *
 * Writes to the structured log rather than a table. An unbounded event table on a
 * 500 MB database is a slow leak, and these numbers are only ever read in
 * aggregate. When a real analytics provider is chosen this is the one place that
 * changes.
 *
 * Accepts only a fixed set of event names and records no personal data — no IP, no
 * user agent, no identifier of any kind.
 */
const ALLOWED_EVENTS = new Set(['whatsapp_click']);

/** Guards against a stray large body; these payloads are tiny. */
const MAX_BODY_BYTES = 1024;

export async function POST(request: Request): Promise<Response> {
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return new Response(null, { status: 413 });
    }

    const parsed = JSON.parse(raw) as { event?: unknown; properties?: unknown };
    const event = typeof parsed.event === 'string' ? parsed.event : null;

    if (!event || !ALLOWED_EVENTS.has(event)) {
      return new Response(null, { status: 204 });
    }

    const context =
      typeof parsed.properties === 'object' &&
      parsed.properties !== null &&
      typeof (parsed.properties as { context?: unknown }).context === 'string'
        ? (parsed.properties as { context: string }).context.slice(0, 64)
        : 'unknown';

    console.info('[event]', JSON.stringify({ event, context, at: new Date().toISOString() }));

    return new Response(null, { status: 204 });
  } catch (error) {
    // A malformed beacon is not worth an error response; it is worth a log line.
    console.warn('[event] rejected', {
      message: error instanceof Error ? error.message : 'unknown error',
    });
    return new Response(null, { status: 204 });
  }
}
