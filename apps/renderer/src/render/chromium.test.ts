import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserPool, CHROMIUM_ARGS, IDLE_SHUTDOWN_MS } from './chromium';

/**
 * RQ-MEM-01 — Chromium is launched on demand and terminated after 60 seconds idle.
 *
 * This is the single largest memory saving on a 1 GB box: it keeps 300–400 MB out
 * of the idle footprint, and it discards whatever Chromium leaked during the job.
 * The test exists because "keep a warm browser for speed" is the most obvious
 * optimisation anyone would reach for, and it is the one that breaks production.
 */
interface FakeBrowser {
  close: () => Promise<void>;
  connected: boolean;
}

function fakeLauncher() {
  const closed: FakeBrowser[] = [];
  let launches = 0;

  const launch = vi.fn(async (): Promise<FakeBrowser> => {
    launches += 1;
    const browser: FakeBrowser = {
      connected: true,
      close: async () => {
        browser.connected = false;
        closed.push(browser);
        return Promise.resolve();
      },
    };
    return Promise.resolve(browser);
  });

  return {
    launch,
    closed,
    get launches() {
      return launches;
    },
  };
}

describe('RQ-MEM-01 — on-demand Chromium lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('launches nothing until a job asks for a browser', () => {
    const launcher = fakeLauncher();
    new BrowserPool({ launch: launcher.launch });

    // Constructing the pool must not start Chromium. A worker sitting idle
    // overnight has to cost nothing.
    expect(launcher.launch).not.toHaveBeenCalled();
  });

  it('terminates the browser 60 seconds after the last job releases it', async () => {
    const launcher = fakeLauncher();
    const pool = new BrowserPool({ launch: launcher.launch });

    const browser = await pool.acquire();
    expect(launcher.launches).toBe(1);
    expect(browser.connected).toBe(true);

    pool.release();

    // Still alive just before the deadline: a queue of jobs arriving back to back
    // should not pay the cold start every time.
    await vi.advanceTimersByTimeAsync(IDLE_SHUTDOWN_MS - 1000);
    expect(browser.connected).toBe(true);

    await vi.advanceTimersByTimeAsync(2000);
    expect(browser.connected).toBe(false);
    expect(IDLE_SHUTDOWN_MS).toBe(60_000);
  });

  it('reuses the browser for a job that arrives inside the idle window', async () => {
    const launcher = fakeLauncher();
    const pool = new BrowserPool({ launch: launcher.launch });

    const first = await pool.acquire();
    pool.release();
    await vi.advanceTimersByTimeAsync(10_000);

    const second = await pool.acquire();
    expect(second).toBe(first);
    expect(launcher.launches).toBe(1);
  });

  it('launches a fresh browser once the idle timer has fired', async () => {
    const launcher = fakeLauncher();
    const pool = new BrowserPool({ launch: launcher.launch });

    await pool.acquire();
    pool.release();
    await vi.advanceTimersByTimeAsync(IDLE_SHUTDOWN_MS + 1000);

    await pool.acquire();
    expect(launcher.launches).toBe(2);
  });

  it('never lets the idle timer fire while a job still holds the browser', async () => {
    const launcher = fakeLauncher();
    const pool = new BrowserPool({ launch: launcher.launch });

    const browser = await pool.acquire();
    await vi.advanceTimersByTimeAsync(IDLE_SHUTDOWN_MS * 3);

    expect(browser.connected).toBe(true);
  });

  it('kills the browser immediately on demand, for the timeout path', async () => {
    const launcher = fakeLauncher();
    const pool = new BrowserPool({ launch: launcher.launch });

    const browser = await pool.acquire();
    await pool.kill();

    // RQ-MEM-08: a hung render is killed, not waited out.
    expect(browser.connected).toBe(false);
  });

  it('is not a pool of more than one — a second acquire gets the same browser', async () => {
    const launcher = fakeLauncher();
    const pool = new BrowserPool({ launch: launcher.launch });

    const first = await pool.acquire();
    const second = await pool.acquire();

    expect(second).toBe(first);
    expect(launcher.launches).toBe(1);
  });
});

describe('RQ-MEM-07 — Chromium launch flags', () => {
  it('carries every flag the memory budget requires', () => {
    // Named individually rather than as a snapshot: when one disappears, the
    // failure should say which one.
    expect(CHROMIUM_ARGS).toContain('--disable-dev-shm-usage');
    expect(CHROMIUM_ARGS).toContain('--disable-gpu');
    expect(CHROMIUM_ARGS).toContain('--no-sandbox');
    expect(CHROMIUM_ARGS).toContain('--js-flags=--max-old-space-size=256');
  });
});
