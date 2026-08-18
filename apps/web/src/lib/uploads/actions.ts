'use server';

import { prisma } from '@buildcalendar/db';
import { getAuthContext } from '../auth/session';
import { en } from '../i18n/en';
import { deleteObject, putObject } from '../storage/r2';
import { assetKeys } from './keys';
import { processUpload } from './process';
import { validateUpload, type UploadRejection } from './validate';

/**
 * Accepting a photo (P1-US-304).
 *
 * Order matters and is not negotiable: validate by magic bytes, decode, apply
 * orientation, strip every scrap of metadata, write three derivatives, and never
 * write the original anywhere. The uploaded bytes exist only in memory and are
 * gone when this function returns.
 *
 * Keys follow the story exactly: `users/{userId}/assets/{assetId}/{variant}.jpg`.
 * The bucket is private and reads go through our own route (NFR-S04) — the same
 * bucket holds every customer's photos.
 */
export interface UploadResult {
  ok: boolean;
  assetId?: string;
  error?: string;
}

const REJECTION_MESSAGE: Record<UploadRejection, string> = {
  empty: en.uploads.errors.empty,
  tooLarge: en.uploads.errors.tooLarge,
  unsupportedType: en.uploads.errors.unsupportedType,
};

export async function uploadPhotoAction(formData: FormData): Promise<UploadResult> {
  const context = await getAuthContext();
  if (!context.user) return { ok: false, error: en.auth.errors.signInRequired };

  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, error: en.uploads.errors.empty };

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Magic bytes, never the extension (NFR-S03).
  const validation = validateUpload(bytes, file.name);
  if (!validation.ok) return { ok: false, error: REJECTION_MESSAGE[validation.reason] };

  let processed;
  try {
    processed = await processUpload(Buffer.from(bytes), validation.mime);
  } catch (error) {
    // A file that passes the signature check but will not decode — a truncated
    // upload, or HEIC the build cannot read.
    console.warn('[uploads] decode failed', {
      mime: validation.mime,
      message: error instanceof Error ? error.message : 'unknown error',
    });
    return { ok: false, error: en.uploads.errors.decodeFailed };
  }

  const assetId = crypto.randomUUID();
  const userId = context.user.id;
  const keys = assetKeys(userId, assetId);

  try {
    // Files first: a row pointing at a missing object is worse than an orphan
    // object nobody references.
    await Promise.all([
      putObject(keys.print, processed.variants.print.bytes, 'image/jpeg'),
      putObject(keys.preview, processed.variants.preview.bytes, 'image/jpeg'),
      putObject(keys.thumb, processed.variants.thumb.bytes, 'image/jpeg'),
    ]);
  } catch (error) {
    console.error('[uploads] storage write failed', {
      assetId,
      message: error instanceof Error ? error.message : 'unknown error',
    });
    // Best effort: do not leave a partial set behind.
    await Promise.all(
      Object.values(keys).map((key) => deleteObject(key).catch(() => undefined)),
    );
    return { ok: false, error: en.uploads.errors.storageFailed };
  }

  const asset = await prisma.projectAsset.create({
    data: {
      id: assetId,
      userId,
      storageKeyPrint: keys.print,
      storageKeyPreview: keys.preview,
      storageKeyThumb: keys.thumb,
      widthPx: processed.widthPx,
      heightPx: processed.heightPx,
      mime: processed.mime,
      sizeBytes: processed.sizeBytes,
      // Label only. It is never used to build a path.
      filename: file.name.slice(0, 120),
    },
    select: { id: true },
  });

  return { ok: true, assetId: asset.id };
}

/**
 * "My gallery" (P1-US-304): every photo this user has uploaded, newest first,
 * reusable on any sheet of any project.
 */
export interface GalleryAsset {
  id: string;
  widthPx: number;
  heightPx: number;
  filename: string | null;
}

export async function listGalleryAction(): Promise<GalleryAsset[]> {
  const context = await getAuthContext();
  if (!context.user) return [];

  return prisma.projectAsset.findMany({
    // Ownership in the WHERE clause, not checked afterwards.
    where: { userId: context.user.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { id: true, widthPx: true, heightPx: true, filename: true },
    take: 200,
  });
}

/**
 * P1-US-304: deleting a gallery photo warns if another project uses it.
 *
 * Returns the count rather than deciding for the user — the warning is theirs to
 * accept.
 */
export async function countProjectsUsingAsset(
  assetId: string,
  exceptProjectId?: string,
): Promise<number> {
  const context = await getAuthContext();
  if (!context.user) return 0;

  // Scoped to the caller's own assets.
  const asset = await prisma.projectAsset.findFirst({
    where: { id: assetId, userId: context.user.id, deletedAt: null },
    select: { id: true },
  });
  if (!asset) return 0;

  // A slot value referencing this asset lives inside the project's design JSON.
  const projects = await prisma.project.findMany({
    where: {
      userId: context.user.id,
      deletedAt: null,
      ...(exceptProjectId ? { id: { not: exceptProjectId } } : {}),
    },
    select: { designJson: true },
  });

  return projects.filter((project) => JSON.stringify(project.designJson).includes(assetId)).length;
}

/**
 * Removes a photo from the gallery.
 *
 * Soft delete: the row is marked and the objects are removed. A project still
 * referencing the asset keeps an empty slot rather than a broken image, which is
 * what the confirmation warned about.
 */
export async function deleteAssetAction(assetId: string): Promise<{ ok: boolean; error?: string }> {
  const context = await getAuthContext();
  if (!context.user) return { ok: false, error: en.auth.errors.signInRequired };

  const asset = await prisma.projectAsset.findFirst({
    where: { id: assetId, userId: context.user.id, deletedAt: null },
    select: { storageKeyPrint: true, storageKeyPreview: true, storageKeyThumb: true },
  });
  if (!asset) return { ok: false, error: en.uploads.errors.notFound };

  await prisma.projectAsset.update({
    where: { id: assetId },
    data: { deletedAt: new Date() },
  });

  // The row is already gone from the user's view; a failed object delete is a
  // storage cost, not a correctness problem, so it must not fail the action.
  await Promise.all(
    [asset.storageKeyPrint, asset.storageKeyPreview, asset.storageKeyThumb].map((key) =>
      deleteObject(key).catch((error: unknown) => {
        console.warn('[uploads] object delete failed', {
          key,
          message: error instanceof Error ? error.message : 'unknown error',
        });
      }),
    ),
  );

  return { ok: true };
}
