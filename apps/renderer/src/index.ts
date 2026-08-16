/**
 * Renderer service — skeleton only (P1-US-001).
 *
 * It boots, answers a health check, and holds an idle BullMQ worker so the queue
 * wiring and the memory constraints are in place. The actual render pipeline
 * (SVG -> HTML -> page.pdf, sharp pre-sizing, on-demand Chromium) is P1-US-601.
 * The `spike/` directory already proved that pipeline works inside 1 GB.
 */
import { createServer } from 'node:http';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from './config.js';

const connection = new Redis(config.redisUrl, {
  // BullMQ requires this; without it a blocking command can be retried forever.
  maxRetriesPerRequest: null,
});

connection.on('error', (error: Error) => {
  console.error('[renderer] redis error:', error.message);
});

const worker = new Worker(
  config.queueName,
  async (job) => {
    // P1-US-601 replaces this. Failing loudly is better than silently succeeding
    // and letting the web app believe an export was produced.
    throw new Error(`render pipeline not implemented yet (job ${job.id})`);
  },
  {
    connection,
    concurrency: config.concurrency, // RQ-MEM-04 — see config.ts
  },
);

worker.on('failed', (job, error) => {
  console.error(`[renderer] job ${job?.id ?? '?'} failed:`, error.message);
});

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        queue: config.queueName,
        concurrency: config.concurrency,
        redis: connection.status,
      }),
    );
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(config.port, () => {
  console.log(`[renderer] listening on :${config.port}, queue "${config.queueName}"`);
  if (!config.sharedSecret) {
    console.warn('[renderer] RENDERER_SHARED_SECRET is empty — set it before exposing anything');
  }
});

async function shutdown(signal: string) {
  console.log(`[renderer] ${signal} received, shutting down`);
  server.close();
  await worker.close();
  await connection.quit();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
