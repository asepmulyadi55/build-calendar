'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@buildcalendar/db';
import { en, fill } from '../i18n/en';
import { routes } from '../routes';
import { getAuthContext } from '../auth/session';
import { getObjectText } from '../storage/r2';
import { buildProjectFromTemplate } from './create';

/**
 * Starting a calendar from a template (P1-US-302).
 *
 * The design is read from R2 and **copied** into `projects.design_json`. The
 * project keeps `template_id` for reporting only — nothing ever reads the design
 * back through it, which is what stops a later template edit from rewriting a
 * calendar somebody already built.
 *
 * A signed-out visitor is sent to `/signin?callbackUrl=…` and lands back on the
 * same choice.
 */
export interface CreateProjectState {
  error?: string;
}

/** The template was authored for one year; a user may want the next one. */
const MIN_YEAR = 2026;
const MAX_YEAR = 2030;

export async function createProjectFromTemplateAction(
  _previous: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const slug = String(formData.get('slug') ?? '');
  const year = Number(formData.get('year') ?? 0);

  // Where to send a guest back to, so they land on the same choice they made.
  const returnTo = `${routes.newProject}?template=${encodeURIComponent(slug)}`;

  const context = await getAuthContext();
  if (!context.isSignedIn || !context.user || context.isDeleted) {
    redirect(`${routes.signIn}?callbackUrl=${encodeURIComponent(returnTo)}`);
  }

  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    return { error: fill(en.newProject.errors.yearInvalid, { min: MIN_YEAR, max: MAX_YEAR }) };
  }

  const template = await prisma.template.findUnique({
    where: { slug },
    include: { productPreset: true },
  });

  if (!template) return { error: en.newProject.errors.templateNotFound };
  // An inactive template is one an admin has not previewed and approved yet.
  if (!template.isActive) return { error: en.newProject.errors.templateInactive };

  let design: unknown;
  try {
    design = JSON.parse(await getObjectText(template.designKey));
  } catch (error) {
    console.error('[projects] template design could not be read', {
      slug,
      message: error instanceof Error ? error.message : 'unknown error',
    });
    return { error: en.newProject.errors.designUnavailable };
  }

  let project;
  try {
    const data = buildProjectFromTemplate({ design, templateName: template.name, year });

    project = await prisma.project.create({
      data: {
        userId: context.user.id,
        title: data.title,
        productPresetId: template.productPresetId,
        templateId: template.id,
        year: data.year,
        startMonth: data.startMonth,
        designJson: data.designJson as never,
        schemaVersion: data.schemaVersion,
        designBytes: data.designBytes,
        status: data.status,
      },
      select: { id: true },
    });
  } catch (error) {
    console.error('[projects] create failed', {
      slug,
      message: error instanceof Error ? error.message : 'unknown error',
    });
    return { error: en.newProject.errors.createFailed };
  }

  redirect(routes.projectEditor(project.id));
}
