import { prisma } from '@buildcalendar/db';
import { getAuthContext } from '@/lib/auth/session';
import { getObjectBytes } from '@/lib/storage/r2';
import { ASSET_VARIANTS, type AssetVariant } from '@/lib/uploads/keys';

/**
 * Streams one derivative of a user's own photo (P1-US-304).
 *
 * The bucket is private (NFR-S04) and holds every customer's family photos, so
 * this route is the only way in. Two rules make it safe:
 *
 *  - The row is looked up with `userId` in the WHERE clause, not checked after.
 *    "The route is already authenticated" is how IDOR bugs get written.
 *  - The key comes from the row, never from the URL, so a crafted path cannot
 *    reach another prefix.
 *
 * An asset belonging to someone else returns 404, not 403 — a 403 would confirm
 * the id exists.
 */
const COLUMN: Record<AssetVariant, 'storageKeyThumb' | 'storageKeyPreview' | 'storageKeyPrint'> = {
  thumb: 'storageKeyThumb',
  preview: 'storageKeyPreview',
  print: 'storageKeyPrint',
};

function isVariant(value: string): value is AssetVariant {
  return (ASSET_VARIANTS as readonly string[]).includes(value);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; variant: string }> },
): Promise<Response> {
  const context = await getAuthContext();
  if (!context.user) return new Response(null, { status: 401 });

  const { id, variant } = await params;
  if (!isVariant(variant)) return new Response(null, { status: 404 });

  const asset = await prisma.projectAsset.findFirst({
    where: { id, userId: context.user.id, deletedAt: null },
    select: { storageKeyThumb: true, storageKeyPreview: true, storageKeyPrint: true },
  });

  if (!asset) return new Response(null, { status: 404 });

  try {
    const { bytes, contentType } = await getObjectBytes(asset[COLUMN[variant]]);
    return new Response(bytes as BodyInit, {
      headers: {
        'content-type': contentType,
        // Private: one user's photo, never a shared cache.
        'cache-control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[assets] read failed', {
      assetId: id,
      variant,
      message: error instanceof Error ? error.message : 'unknown error',
    });
    return new Response(null, { status: 404 });
  }
}
