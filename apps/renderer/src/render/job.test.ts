import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runWithTimeout, JobTimeoutError } from './job';

/**
 * RQ-MEM-08 — a job that hangs is killed after five minutes.
 *
 * The failure mode this prevents is specific: a wedged Chromium holding 400 MB on a
 * 1 GB box forever, which does not fail the export so much as take the website down
 * with it. Extending the timeout to make a slow case pass is the wrong fix; the
 * point is that the memory comes back.
 */
describe('RQ-MEM-08 — job timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the result when the job finishes in time', async () => {
    const onTimeout = vi.fn(async () => Promise.resolve());

    const promise = runWithTimeout(async () => Promise.resolve('done'), {
      timeoutMs: 1000,
      onTimeout,
    });

    await vi.advanceTimersByTimeAsync(10);
    await expect(promise).resolves.toBe('done');
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('fails the job once the deadline passes', async () => {
    const promise = runWithTimeout(() => new Promise<string>(() => undefined), {
      timeoutMs: 5 * 60 * 1000,
      onTimeout: async () => Promise.resolve(),
    });

    const assertion = expect(promise).rejects.toBeInstanceOf(JobTimeoutError);
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 1);
    await assertion;
  });

  it('kills Chromium when it times out — the memory has to come back', async () => {
    const onTimeout = vi.fn(async () => Promise.resolve());

    const promise = runWithTimeout(() => new Promise<string>(() => undefined), {
      timeoutMs: 1000,
      onTimeout,
    });

    const assertion = expect(promise).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(1001);
    await assertion;

    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('does not kill Chromium when the job merely fails', async () => {
    const onTimeout = vi.fn(async () => Promise.resolve());

    const promise = runWithTimeout(async () => Promise.reject(new Error('bad design')), {
      timeoutMs: 1000,
      onTimeout,
    });

    const assertion = expect(promise).rejects.toThrow('bad design');
    await vi.advanceTimersByTimeAsync(10);
    await assertion;

    // A failed render releases the browser normally; only a hang needs the axe.
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('clears its timer so a finished job cannot fire it later', async () => {
    const onTimeout = vi.fn(async () => Promise.resolve());

    await runWithTimeout(async () => Promise.resolve('done'), { timeoutMs: 1000, onTimeout });
    await vi.advanceTimersByTimeAsync(10_000);

    expect(onTimeout).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
