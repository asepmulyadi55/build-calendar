import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@buildcalendar/db';
import { Badge } from '@buildcalendar/ui';
import { requireUser } from '@/lib/auth/session';
import { en } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';

export const dynamic = 'force-dynamic';

/**
 * Where P1-US-302 lands after creating a project.
 *
 * The editor itself is P1-US-303 and is not built. This page exists so the flow
 * does not dead-end on a 404, and so the copy that was just taken can be seen to
 * be real. It is deliberately the smallest thing that is true.
 */
export default async function ProjectEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await requireUser(routes.projectEditor(id));

  // Scoped to the caller. "The route is already authenticated" is how IDOR bugs
  // get written.
  const project = await prisma.project.findFirst({
    where: { id, userId: context.user!.id, deletedAt: null },
    include: { productPreset: true, template: { select: { name: true } } },
  });
  if (!project) notFound();

  const design = project.designJson as { sheets?: unknown[] };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="crumb">{project.productPreset.name}</div>
          <h1 className="page-title project-title">{project.title}</h1>
        </div>
        <Badge tone="neutral">{project.status}</Badge>
      </div>

      <div className="card editor-placeholder">
        <b className="h3">{en.projectEditor.heading}</b>
        <p className="muted">{en.projectEditor.body}</p>
        <ul className="editor-facts">
          <li>
            {en.projectEditor.sheets}: <b>{design.sheets?.length ?? 0}</b>
          </li>
          <li>
            {en.projectEditor.year}: <b>{project.year}</b>
          </li>
          <li>
            {en.projectEditor.copiedFrom}:{' '}
            <b>{project.template?.name ?? en.projectEditor.templateRemoved}</b>
          </li>
          <li>
            {en.projectEditor.designBytes}: <b>{project.designBytes}</b>
          </li>
        </ul>
        <Link href={routes.newProject} className="btn btn-ghost btn-sm editor-back">
          {en.projectEditor.back}
        </Link>
      </div>
    </>
  );
}
