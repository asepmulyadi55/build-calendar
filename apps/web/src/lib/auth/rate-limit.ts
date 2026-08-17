/**
 * Rate limits (NFR-S02): login 5/min/IP, signup 3/hour/IP.
 *
 * These stand between a leaked password list and every account on the site, so
 * they are enforced on the server, not in the form.
 *
 * The store is in-process. That is a deliberate limit, not an oversight:
 * production is a single web container on one Lightsail box (ADR-0002), so one
 * process sees every request. It becomes wrong the moment a second instance
 * exists — at that point this moves to Redis, which is already running for the
 * queue. The counters also reset on deploy, which is acceptable for a limit
 * measured in minutes.
 */
export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const RATE_LIMITS = {
  login: { limit: 5, windowMs: MINUTE },
  signup: { limit: 3, windowMs: HOUR },
  passwordReset: { limit: 3, windowMs: HOUR },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitedAction = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  get size(): number {
    return this.buckets.size;
  }

  /**
   * @param key usually the caller's IP. A missing IP shares one bucket rather than
   *   skipping the limit — failing open would make it bypassable behind any proxy
   *   that strips the header.
   */
  check(action: RateLimitedAction, key: string | null | undefined): RateLimitResult {
    const rule = RATE_LIMITS[action];
    const now = Date.now();

    this.sweep(now);

    const bucketKey = `${action}:${key ?? 'unknown'}`;
    const existing = this.buckets.get(bucketKey);

    if (!existing || existing.resetAt <= now) {
      this.buckets.set(bucketKey, { count: 1, resetAt: now + rule.windowMs });
      return { allowed: true, remaining: rule.limit - 1, retryAfterSeconds: 0 };
    }

    existing.count++;

    if (existing.count > rule.limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      };
    }

    return {
      allowed: true,
      remaining: rule.limit - existing.count,
      retryAfterSeconds: 0,
    };
  }

  /** Drops expired buckets on write, so the map cannot grow without bound. */
  private sweep(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

/**
 * One limiter per process. Next.js reloads modules in development, so it is
 * pinned to `globalThis` the same way the Prisma client is.
 */
declare global {
  var __rateLimiter: RateLimiter | undefined;
}

export const rateLimiter: RateLimiter = (globalThis.__rateLimiter ??= new RateLimiter());
