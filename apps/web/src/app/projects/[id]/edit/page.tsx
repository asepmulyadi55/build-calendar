import { notFound } from 'next/navigation';
import { prisma } from '@buildcalendar/db';
import type { Holiday } from '@buildcalendar/calendar-core';
import { Editor } from '@/components/editor/Editor';
import { requireUser } from '@/lib/auth/session';
import type { SlotSchema, SlotValue } from '@/lib/editor/state';
import { routes } from '@/lib/routes';

export const dynamic = 'force-dynamic';

/** The template-mode editor (P1-US-303). */
export default async function ProjectEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await requireUser(routes.projectEditor(id));

  // Scoped to the caller. "The route is already authenticated" is how IDOR bugs
  // get written.
  const project = await prisma.project.findFirst({
    where: { id, userId: context.user!.id, deletedAt: null },
    include: { template: { select: { slotSchema: true } } },
  });
  if (!project) notFound();

  const design = project.designJson as unknown as {
    sheets: unknown[];
    slotValues?: Record<string, SlotValue>[];
  };

  // Holidays for the printed grid. Read here so the canvas never fetches.
  const holidays: Holiday[] = (
    await prisma.holiday.findMany({ where: { year: project.year }, orderBy: { date: 'asc' } })
  ).map((holiday) => ({
    date: holiday.date.toISOString().slice(0, 10),
    name: holiday.name,
    type: holiday.type,
    year: holiday.year,
    isRedDate: holiday.isRedDate,
  }));

  const slotSchema = (project.template?.slotSchema as SlotSchema | null) ?? { slots: [] };

  // When this year's holiday set was last loaded (P1-US-305). Joint leave days are
  // decreed late in the preceding year, so a user needs to see how fresh the data
  // is before committing a calendar to print.
  const newest = await prisma.holiday.findFirst({
    where: { year: project.year },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  return (
    <Editor
      projectId={project.id}
      title={project.title}
      year={project.year}
      status={project.status}
      design={design as never}
      slotSchema={slotSchema}
      holidays={holidays}
      holidayDataUpdatedAt={newest?.createdAt.toISOString() ?? null}
      years={[project.year, project.year + 1]}
    />
  );
}
