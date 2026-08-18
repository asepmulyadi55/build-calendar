'use server';

import { prisma } from '@buildcalendar/db';
import { getAuthContext } from '../auth/session';
import { en } from '../i18n/en';
import { canChangeYear, type ProjectStatus, type SlotValue } from './state';

/**
 * Saving the editor's work (P1-US-303).
 *
 * Autosave calls this on a 5-second debounce, so it must be cheap and idempotent.
 *
 * Every rule the reducer enforces is enforced again here. A server action is
 * directly callable, so the client-side check is a convenience and this is the
 * boundary — including BR-U05, which is about money rather than tidiness.
 */
export interface SaveResult {
  ok: boolean;
  error?: string;
}

export async function saveProjectAction(input: {
  projectId: string;
  title: string;
  year: number;
  perSheetValues: Record<string, SlotValue>[];
}): Promise<SaveResult> {
  const context = await getAuthContext();
  if (!context.user) return { ok: false, error: en.auth.errors.signInRequired };

  const title = input.title.trim();
  if (title.length === 0) return { ok: false, error: en.editor.saveFailed };

  // Scoped to the caller's own id, not just "the route was authenticated".
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, userId: context.user.id, deletedAt: null },
    select: { id: true, status: true, year: true, designJson: true },
  });
  if (!project) return { ok: false, error: en.editor.saveFailed };

  // BR-U05 — the year is fixed once a coin has been committed.
  const yearAllowed = input.year === project.year || canChangeYear(project.status as ProjectStatus);
  const year = yearAllowed ? input.year : project.year;

  const design = project.designJson as unknown as Record<string, unknown> & {
    sheets: { objects: Record<string, unknown>[] }[];
  };

  if (year !== project.year) {
    design.year = year;
    for (const sheet of design.sheets) {
      for (const object of sheet.objects) {
        if (object['type'] === 'calendarGrid') object['year'] = year;
      }
    }
  }

  // Slot values live alongside the design. Storing them here keeps a project one
  // row, which is what makes autosave a single cheap write on a 1 GB box.
  design['slotValues'] = input.perSheetValues;

  const serialised = JSON.stringify(design);

  try {
    await prisma.project.update({
      where: { id: project.id },
      data: {
        title,
        year,
        designJson: design as never,
        // Tracked so design growth stays measurable against the quota (§3.2).
        designBytes: Buffer.byteLength(serialised, 'utf8'),
      },
    });
  } catch (error) {
    console.error('[editor] save failed', {
      projectId: input.projectId,
      message: error instanceof Error ? error.message : 'unknown error',
    });
    return { ok: false, error: en.editor.saveFailed };
  }

  return { ok: true };
}
