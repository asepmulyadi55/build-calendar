/**
 * Renderer configuration. The memory-related values here are requirements from
 * `docs/01-tech-stack-and-infrastructure.md` §4.2, not tuning knobs.
 */
export const config = {
  port: Number(process.env.RENDERER_PORT ?? 4000),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',

  /** Requests from `web` must carry this. The service is never publicly exposed. */
  sharedSecret: process.env.RENDERER_SHARED_SECRET ?? '',

  queueName: 'render',

  /**
   * RQ-MEM-04 — locked to 1. Production is a 1 GB box and a single A2 render peaks
   * around 430 MB with Chromium running. Two at once does not fit. Raising this
   * requires a larger instance first; see `01-…` §4.2.
   */
  concurrency: 1,

  /** RQ-MEM-08 — a hung render must never hold memory indefinitely. */
  jobTimeoutMs: 5 * 60 * 1000,
} as const;
