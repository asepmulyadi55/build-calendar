import { prisma } from '@buildcalendar/db';
import { requireAdmin } from '@/lib/auth/admin';
import { getObjectBytes } from '@/lib/storage/r2';
import { routes } from '@/lib/routes';

/**
 * Streams a template thumbnail from R2.
 *
 * Served through our own route rather than a public URL so the bucket stays
 * private (NFR-S04) — the same bucket holds customer photos, and public access on
 * R2 is per-bucket, not per-prefix.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  await requireAdmin(routes.adminTemplates);

  const { slug } = await params;
  const template = await prisma.template.findUnique({
    where: { slug },
    select: { thumbnailKey: true },
  });

  if (!template?.thumbnailKey) return new Response(null, { status: 404 });

  try {
    const { bytes, contentType } = await getObjectBytes(template.thumbnailKey);
    return new Response(bytes as BodyInit, {
      headers: {
        'content-type': contentType,
        // Private: this is an admin-only view of an object in a private bucket.
        'cache-control': 'private, max-age=300',
      },
    });
  } catch (error) {
    console.error('[admin] thumbnail read failed', {
      slug,
      message: error instanceof Error ? error.message : 'unknown error',
    });
    return new Response(null, { status: 404 });
  }
}
