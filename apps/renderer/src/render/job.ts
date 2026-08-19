/**
 * RQ-MEM-08 — the job deadline.
 *
 * Five minutes, after which the job fails cleanly and Chromium is killed. A hung
 * render must never hold memory indefinitely: on a 1 GB box a wedged browser does
 * not just fail an export, it starves Next.js and takes the website down.
 *
 * The timeout does not race the work and then ignore it — `onTimeout` is what
 * actually reclaims the memory, and the job's own promise is left to settle into
 * nothing.
 */
export class JobTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`render timed out after ${String(Math.round(timeoutMs / 1000))}s`);
    this.name = 'JobTimeoutError';
  }
}

export async function runWithTimeout<T>(
  work: () => Promise<T>,
  options: { timeoutMs: number; onTimeout: () => Promise<void> },
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      // Kill first, reject second. If the order were reversed the job would be
      // reported failed while Chromium was still holding its memory.
      void options
        .onTimeout()
        .catch((error: unknown) => {
          console.error(
            '[renderer] killing chromium after timeout failed:',
            error instanceof Error ? error.message : 'unknown error',
          );
        })
        .finally(() => {
          reject(new JobTimeoutError(options.timeoutMs));
        });
    }, options.timeoutMs);
  });

  try {
    return await Promise.race([work(), deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
