/**
 * R2 access for the renderer.
 *
 * Print derivatives are read in before Chromium launches, and the finished PDF is
 * written back afterwards. Neither happens *during* rendering — the page itself
 * only ever sees `file://` (see `render/pipeline.ts`).
 *
 * The renderer holds no database connection. Everything it needs arrives in the job
 * payload, which keeps its idle footprint to the worker plus ioredis and means a
 * render can never hold a Postgres connection open for five minutes.
 */
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

let client: S3Client | null = null;

function r2(): S3Client {
  if (client) return client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials are not configured');
  }

  client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return client;
}

function bucket(): string {
  const name = process.env.R2_BUCKET;
  if (!name) throw new Error('R2_BUCKET is not set');
  return name;
}

export async function getObjectBytes(key: string): Promise<Buffer> {
  const result = await r2().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  if (!result.Body) throw new Error(`object ${key} has no body`);
  return Buffer.from(await result.Body.transformToByteArray());
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await r2().send(
    new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }),
  );
}
