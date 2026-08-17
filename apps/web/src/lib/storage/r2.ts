import 'server-only';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

/**
 * Cloudflare R2 (ADR-0001). Every file the product stores lives here — never in
 * Postgres, which holds only the key (AR-07).
 *
 * R2 speaks S3, so the AWS SDK is the client. The bucket stays private: nothing
 * here makes an object public, and reads are served through our own routes rather
 * than a public URL. That is what NFR-S04 asks for, and it keeps
 * `R2_PUBLIC_BASE_URL` unnecessary until there is a domain and a genuinely public
 * asset.
 */
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
    // R2_ENDPOINT exists so a local S3-compatible server can stand in during
    // development and tests. Production leaves it unset.
    endpoint: process.env.R2_ENDPOINT ?? `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: Boolean(process.env.R2_ENDPOINT),
  });

  return client;
}

function bucket(): string {
  const name = process.env.R2_BUCKET;
  if (!name) throw new Error('R2_BUCKET is not set');
  return name;
}

export async function putObject(
  key: string,
  body: Uint8Array | string,
  contentType: string,
): Promise<void> {
  await r2().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getObjectText(key: string): Promise<string> {
  const result = await r2().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  if (!result.Body) throw new Error(`object ${key} has no body`);
  return result.Body.transformToString('utf-8');
}

export async function getObjectBytes(
  key: string,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const result = await r2().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  if (!result.Body) throw new Error(`object ${key} has no body`);

  return {
    bytes: await result.Body.transformToByteArray(),
    contentType: result.ContentType ?? 'application/octet-stream',
  };
}

export async function deleteObject(key: string): Promise<void> {
  await r2().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

/** True when R2 is configured at all, so the admin can be told rather than crash. */
export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET,
  );
}

/** Object keys for a template's files. Slug-based, so they are legible in a bucket listing. */
export const templateKeys = {
  design: (slug: string) => `templates/${slug}/design.json`,
  thumbnail: (slug: string, extension: string) => `templates/${slug}/thumbnail.${extension}`,
};
