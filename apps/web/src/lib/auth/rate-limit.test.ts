import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RATE_LIMITS, RateLimiter } from './rate-limit';

/**
 * NFR-S02: login 5/min/IP, signup 3/hour/IP.
 *
 * These are the limits that stand between a leaked password list and every
 * account on the site, so they are tested rather than assumed.
 */
describe('RATE_LIMITS', () => {
  it('matches NFR-S02 exactly', () => {
    expect(RATE_LIMITS.login).toEqual({ limit: 5, windowMs: 60_000 });
    expect(RATE_LIMITS.signup).toEqual({ limit: 3, windowMs: 60 * 60_000 });
    expect(RATE_LIMITS.passwordReset).toEqual({ limit: 3, windowMs: 60 * 60_000 });
  });
});

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-01-01T00:00:00Z'));
    limiter = new RateLimiter();
  });

  it('allows exactly the configured number of attempts', () => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      expect(limiter.check('login', '10.0.0.1').allowed, `attempt ${attempt}`).toBe(true);
    }
    expect(limiter.check('login', '10.0.0.1').allowed).toBe(false);
  });

  it('counts each key separately, so one attacker cannot lock everyone out', () => {
    for (let attempt = 1; attempt <= 5; attempt++) limiter.check('login', '10.0.0.1');

    expect(limiter.check('login', '10.0.0.1').allowed).toBe(false);
    expect(limiter.check('login', '10.0.0.2').allowed).toBe(true);
  });

  it('counts each action separately', () => {
    for (let attempt = 1; attempt <= 5; attempt++) limiter.check('login', '10.0.0.1');

    expect(limiter.check('login', '10.0.0.1').allowed).toBe(false);
    expect(limiter.check('signup', '10.0.0.1').allowed).toBe(true);
  });

  it('recovers once the window passes', () => {
    for (let attempt = 1; attempt <= 5; attempt++) limiter.check('login', '10.0.0.1');
    expect(limiter.check('login', '10.0.0.1').allowed).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(limiter.check('login', '10.0.0.1').allowed).toBe(true);
  });

  it('does not recover early', () => {
    for (let attempt = 1; attempt <= 5; attempt++) limiter.check('login', '10.0.0.1');

    vi.advanceTimersByTime(59_000);
    expect(limiter.check('login', '10.0.0.1').allowed).toBe(false);
  });

  it('holds signup to three an hour', () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      expect(limiter.check('signup', '10.0.0.1').allowed).toBe(true);
    }
    expect(limiter.check('signup', '10.0.0.1').allowed).toBe(false);

    vi.advanceTimersByTime(59 * 60_000);
    expect(limiter.check('signup', '10.0.0.1').allowed).toBe(false);

    vi.advanceTimersByTime(2 * 60_000);
    expect(limiter.check('signup', '10.0.0.1').allowed).toBe(true);
  });

  it('reports when the caller may retry, so the message can say so', () => {
    for (let attempt = 1; attempt <= 5; attempt++) limiter.check('login', '10.0.0.1');

    const blocked = limiter.check('login', '10.0.0.1');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it('forgets entries whose window has passed, so memory does not grow forever', () => {
    for (let ip = 0; ip < 200; ip++) limiter.check('login', `10.0.0.${String(ip)}`);
    expect(limiter.size).toBe(200);

    vi.advanceTimersByTime(60_001);
    limiter.check('login', '10.0.1.1');

    // The sweep runs on write, so the stale entries are gone.
    expect(limiter.size).toBeLessThan(200);
  });

  it('treats a missing IP as one shared bucket rather than skipping the limit', () => {
    // Failing open here would make the limit trivially bypassable behind a proxy
    // that strips the header.
    for (let attempt = 1; attempt <= 5; attempt++) limiter.check('login', null);
    expect(limiter.check('login', null).allowed).toBe(false);
  });
});
