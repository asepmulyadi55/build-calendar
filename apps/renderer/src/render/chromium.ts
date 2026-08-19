/**
 * RQ-MEM-01 — Chromium's lifecycle.
 *
 * Launched when a job needs it, terminated 60 seconds after the last one lets go.
 * It is never kept warm. This keeps 300–400 MB out of the idle footprint on a 1 GB
 * box, and it throws away whatever Chromium accumulated during the job.
 *
 * A persistent browser pool is the obvious optimisation here and it is the one
 * thing that must not happen: see `01-…` §4.2 and `docs/DECISIONS.md`. The ~1
 * second cold start is the price, and it was accepted deliberately.
 */

/** RQ-MEM-01. Sixty seconds, from `01-…` §4.2. */
export const IDLE_SHUTDOWN_MS = 60_000;

/**
 * RQ-MEM-07. `--single-process` is deliberately absent: the spike found it unstable
 * on this Chromium build, and §4.2 qualifies it with "where stable".
 */
export const CHROMIUM_ARGS: readonly string[] = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--headless=new',
  '--js-flags=--max-old-space-size=256',
  // Hinting varies with the host's font config; switching it off keeps output
  // identical between a developer's machine and the server.
  '--font-render-hinting=none',
];

/** The slice of Puppeteer's Browser this module depends on, so it can be faked. */
export interface ClosableBrowser {
  close: () => Promise<void>;
}

export interface BrowserPoolOptions<T extends ClosableBrowser> {
  launch: () => Promise<T>;
  idleMs?: number;
}

/**
 * Holds at most one browser, and only while it is wanted.
 *
 * Named a pool because that is what the call site expects to find; the whole point
 * is that its size is one and its idle lifetime is bounded.
 */
export class BrowserPool<T extends ClosableBrowser> {
  private browser: T | null = null;
  private launching: Promise<T> | null = null;
  private leases = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  private readonly launch: () => Promise<T>;
  private readonly idleMs: number;

  constructor(options: BrowserPoolOptions<T>) {
    this.launch = options.launch;
    this.idleMs = options.idleMs ?? IDLE_SHUTDOWN_MS;
  }

  async acquire(): Promise<T> {
    this.cancelTimer();
    this.leases += 1;

    if (this.browser) return this.browser;

    // Concurrency is 1 (RQ-MEM-04), but the timeout path can race with a job, so
    // two callers must never launch two browsers.
    this.launching ??= this.launch().then((browser) => {
      this.browser = browser;
      this.launching = null;
      return browser;
    });

    return this.launching;
  }

  /** Hand the browser back. The idle clock starts when nothing holds it. */
  release(): void {
    this.leases = Math.max(0, this.leases - 1);
    if (this.leases > 0) return;

    this.cancelTimer();
    this.timer = setTimeout(() => {
      void this.kill();
    }, this.idleMs);

    // Node should be free to exit while a browser sits idle.
    this.timer.unref?.();
  }

  /** Terminate now. Used by the timeout path and by shutdown. */
  async kill(): Promise<void> {
    this.cancelTimer();
    this.leases = 0;

    const browser = this.browser;
    this.browser = null;
    if (!browser) return;

    try {
      await browser.close();
    } catch (error) {
      // A browser that already died is the outcome we wanted. Log and carry on;
      // throwing here would fail a job that had already succeeded.
      console.warn(
        '[renderer] closing chromium failed:',
        error instanceof Error ? error.message : 'unknown error',
      );
    }
  }

  private cancelTimer(): void {
    if (!this.timer) return;
    clearTimeout(this.timer);
    this.timer = null;
  }
}
