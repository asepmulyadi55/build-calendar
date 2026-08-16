import { prisma } from '@buildcalendar/db';
import { en } from '@/lib/i18n/en';

// Always hit the database; a cached response would not keep the Supabase project
// awake and would not tell us anything about the database being reachable.
export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 *
 * UptimeRobot pings this every 15 minutes. The trivial query is deliberate: a free
 * Supabase project pauses after 7 days without a database request (`01-…` §3.3),
 * and a paused project means users cannot save work or top up.
 *
 * 200 when the database answers, 503 when it does not — so an uptime monitor can
 * tell "the site is up" from "the site is up but the database is gone".
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`select 1`;
    return Response.json(
      {
        status: en.health.ok,
        database: en.health.ok,
        latencyMs: Date.now() - startedAt,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[health] database check failed', error);
    return Response.json(
      {
        status: en.health.degraded,
        database: en.health.databaseUnreachable,
        latencyMs: Date.now() - startedAt,
      },
      { status: 503 },
    );
  }
}
