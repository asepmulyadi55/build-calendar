/**
 * Renderer service (P1-US-601).
 *
 * A BullMQ worker with a small HTTP surface. It is not published to the host — see
 * `infra/docker-compose.yml`, where it is `expose`d to the Compose network only —
 * and every request that is not the container health probe must carry
 * `RENDERER_SHARED_SECRET`.
 *
 * The memory rules that keep this viable on a 1 GB box live in `render/`: Chromium
 * on demand and killed after 60 s idle (RQ-MEM-01), one sheet at a time (RQ-MEM-02),
 * images pre-sized by sharp (RQ-MEM-03), concurrency 1 (RQ-MEM-04), a 5 minute
 * deadline (RQ-MEM-08). None of them is a tuning knob.
 */
import { createServer } from 'node:http';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { secretMatches } from './auth.js';
import { config } from './config.js';
import { createRenderPool, processRenderJob, type RenderJobPayload } from './worker.js';

const connection = new Redis(config.redisUrl, {
  // BullMQ requires this; without it a blocking command can be retried forever.
  maxRetriesPerRequest: null,
});

connection.on('error', (error: Error) => {
  console.error('[renderer] redis error:', error.message);
});

// One pool for the process. It holds a browser only while jobs are arriving.
const pool = createRenderPool();

const worker = new Worker<RenderJobPayload>(
  config.queueName,
  async (job) => {
    const started = Date.now();
    const result = await processRenderJob(job.data, pool);

    console.log('[renderer] rendered', {
      jobId: job.id,
      exportJobId: job.data.exportJobId,
      pages: result.pages,
      bytes: result.bytes,
      ms: Date.now() - started,
    });

    return result;
  },
  {
    connection,
    concurrency: config.concurrency, // RQ-MEM-04 — see config.ts and `01-…` §4.2
  },
);

worker.on('failed', (job, error) => {
  // The message is stored on `export_jobs` and shown to the user with a trace ID
  // (P1-US-602). Stack traces stay here.
  console.error('[renderer] job failed', {
    jobId: job?.id ?? '?',
    exportJobId: job?.data.exportJobId ?? '?',
    message: error.message,
  });
});

const server = createServer((req, res) => {
  const json = (status: number, body: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  // The container health probe runs inside the network namespace and has no secret
  // to present. It reveals nothing beyond liveness.
  if (req.url === '/health') {
    json(200, { status: 'ok' });
    return;
  }

  if (!secretMatches(config.sharedSecret, req.headers['x-renderer-secret'] as string | undefined)) {
    json(401, { error: 'unauthorized' });
    return;
  }

  if (req.url === '/status') {
    json(200, {
      status: 'ok',
      queue: config.queueName,
      concurrency: config.concurrency,
      redis: connection.status,
    });
    return;
  }

  json(404, { error: 'not found' });
});

server.listen(config.port, () => {
  console.log(`[renderer] listening on :${config.port}, queue "${config.queueName}"`);
  if (!config.sharedSecret) {
    // Not a warning any more: without the secret every authenticated route is
    // closed, which is the safe failure but not a working service.
    console.error('[renderer] RENDERER_SHARED_SECRET is empty — authenticated routes will 401');
  }
});

async function shutdown(signal: string) {
  console.log(`[renderer] ${signal} received, shutting down`);
  server.close();
  await worker.close();
  // Never leave Chromium behind holding 400 MB.
  await pool.kill();
  await connection.quit();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
