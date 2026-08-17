'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@buildcalendar/db';
import { validateCalendarDesign, type PresetConstraints } from '@buildcalendar/calendar-core';
import { requireAdmin } from '../auth/admin';
import { en } from '../i18n/en';
import { routes } from '../routes';
import { deleteObject, isStorageConfigured, putObject, templateKeys } from '../storage/r2';
import { readableIssues, type ReadableIssue } from './validation-messages';

/**
 * Template management (P1-US-702).
 *
 * Phase 3 does not exist, so a template is authored as a file and imported here.
 * Everything is validated against the chosen product preset **before** anything is
 * written: a broken template stored now surfaces months later as a calendar that
 * cannot be exported, by which time nobody remembers what was uploaded.
 *
 * Every action re-checks the admin role. The layout guard is convenience; a server
 * action is directly callable and must stand on its own.
 */
export interface TemplateActionState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
  issues?: ReadableIssue[];
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024;

/** Magic bytes, not the file extension (NFR-S03). */
const IMAGE_SIGNATURES: {
  extension: string;
  contentType: string;
  matches: (b: Uint8Array) => boolean;
}[] = [
  {
    extension: 'jpg',
    contentType: 'image/jpeg',
    matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    extension: 'png',
    contentType: 'image/png',
    matches: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    extension: 'webp',
    contentType: 'image/webp',
    matches: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57,
  },
];

function presetConstraints(preset: {
  code: string;
  sheetCount: number;
  widthMm: number;
  heightMm: number;
  bleedMm: number;
  monthsPerSheet: number;
  hasCover: boolean;
}): PresetConstraints {
  return {
    code: preset.code,
    sheetCount: preset.sheetCount,
    widthMm: preset.widthMm,
    heightMm: preset.heightMm,
    bleedMm: preset.bleedMm,
    monthsPerSheet: preset.monthsPerSheet,
    hasCover: preset.hasCover,
  };
}

async function readDesign(
  formData: FormData,
): Promise<{ design: unknown; raw: string } | { error: string }> {
  const file = formData.get('designFile');
  const pasted = String(formData.get('designJson') ?? '').trim();

  let raw = pasted;
  if (file instanceof File && file.size > 0) raw = (await file.text()).trim();

  if (raw.length === 0) return { error: en.admin.templates.errors.designRequired };

  try {
    return { design: JSON.parse(raw) as unknown, raw };
  } catch {
    return { error: en.admin.templates.errors.designNotJson };
  }
}

async function readThumbnail(
  formData: FormData,
): Promise<
  { bytes: Uint8Array; extension: string; contentType: string } | null | { error: string }
> {
  const file = formData.get('thumbnail');
  if (!(file instanceof File) || file.size === 0) return null;

  if (file.size > MAX_THUMBNAIL_BYTES) {
    return { error: en.admin.templates.errors.thumbnailTooLarge };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const signature = IMAGE_SIGNATURES.find((candidate) => candidate.matches(bytes));
  if (!signature) return { error: en.admin.templates.errors.thumbnailWrongType };

  return { bytes, extension: signature.extension, contentType: signature.contentType };
}

export async function importTemplateAction(
  _previous: TemplateActionState,
  formData: FormData,
): Promise<TemplateActionState> {
  await requireAdmin(routes.adminTemplateNew);

  if (!isStorageConfigured()) {
    return { error: en.admin.templates.errors.storageNotConfigured };
  }

  const name = String(formData.get('name') ?? '').trim();
  const slug = String(formData.get('slug') ?? '')
    .trim()
    .toLowerCase();
  const category = String(formData.get('category') ?? '').trim();
  const productPresetId = String(formData.get('productPresetId') ?? '');
  const sortOrder = Number(formData.get('sortOrder') ?? 0);
  const isPremium = formData.get('isPremium') === 'on';

  const fieldErrors: Record<string, string> = {};
  if (name.length === 0) fieldErrors['name'] = en.admin.templates.errors.nameRequired;
  if (!SLUG_PATTERN.test(slug)) fieldErrors['slug'] = en.admin.templates.errors.slugInvalid;
  if (category.length === 0) fieldErrors['category'] = en.admin.templates.errors.categoryRequired;
  if (productPresetId.length === 0) {
    fieldErrors['productPresetId'] = en.admin.templates.errors.presetRequired;
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const preset = await prisma.productPreset.findUnique({ where: { id: productPresetId } });
  if (!preset)
    return { fieldErrors: { productPresetId: en.admin.templates.errors.presetRequired } };

  const existing = await prisma.template.findUnique({ where: { slug } });
  if (existing) return { fieldErrors: { slug: en.admin.templates.errors.slugTaken } };

  const parsed = await readDesign(formData);
  if ('error' in parsed) return { fieldErrors: { designJson: parsed.error } };

  const thumbnail = await readThumbnail(formData);
  if (thumbnail && 'error' in thumbnail) {
    return { fieldErrors: { thumbnail: thumbnail.error } };
  }

  // The gate. Nothing is written unless the design is whole.
  const result = validateCalendarDesign(parsed.design, presetConstraints(preset));
  if (!result.valid || !result.slotSchema) {
    return {
      error: en.admin.templates.errors.validationFailed,
      issues: readableIssues(result.issues),
    };
  }

  const designKey = templateKeys.design(slug);
  const thumbnailKey = thumbnail ? templateKeys.thumbnail(slug, thumbnail.extension) : null;

  try {
    // Files first: a row pointing at a missing object is worse than an orphan
    // object nobody references.
    await putObject(designKey, parsed.raw, 'application/json');
    if (thumbnail) await putObject(thumbnailKey!, thumbnail.bytes, thumbnail.contentType);
  } catch (error) {
    console.error('[admin] template upload failed', {
      slug,
      message: error instanceof Error ? error.message : 'unknown error',
    });
    return { error: en.admin.templates.errors.storageNotConfigured };
  }

  await prisma.template.create({
    data: {
      name,
      slug,
      category,
      productPresetId: preset.id,
      designKey,
      thumbnailKey,
      slotSchema: result.slotSchema as never,
      isPremium,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      // Inactive until a human has previewed it. That is the whole point of the
      // preview step in this story.
      isActive: false,
    },
  });

  revalidatePath(routes.adminTemplates);
  redirect(`${routes.adminTemplates}/${slug}?imported=1`);
}

export async function setTemplateActiveAction(
  _previous: TemplateActionState,
  formData: FormData,
): Promise<TemplateActionState> {
  await requireAdmin(routes.adminTemplates);

  const slug = String(formData.get('slug') ?? '');
  const isActive = formData.get('isActive') === 'true';

  const template = await prisma.template.findUnique({ where: { slug } });
  if (!template) return { error: en.admin.templates.errors.notFound };

  await prisma.template.update({ where: { slug }, data: { isActive } });

  revalidatePath(routes.adminTemplates);
  revalidatePath(`${routes.adminTemplates}/${slug}`);
  // The public gallery reads active templates.
  revalidatePath('/samples');

  return { success: isActive ? en.admin.templates.activated : en.admin.templates.deactivated };
}

export async function updateTemplateAction(
  _previous: TemplateActionState,
  formData: FormData,
): Promise<TemplateActionState> {
  await requireAdmin(routes.adminTemplates);

  const slug = String(formData.get('slug') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim();
  const sortOrder = Number(formData.get('sortOrder') ?? 0);
  const isPremium = formData.get('isPremium') === 'on';

  const fieldErrors: Record<string, string> = {};
  if (name.length === 0) fieldErrors['name'] = en.admin.templates.errors.nameRequired;
  if (category.length === 0) fieldErrors['category'] = en.admin.templates.errors.categoryRequired;
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const template = await prisma.template.findUnique({ where: { slug } });
  if (!template) return { error: en.admin.templates.errors.notFound };

  await prisma.template.update({
    where: { slug },
    data: { name, category, isPremium, sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0 },
  });

  revalidatePath(`${routes.adminTemplates}/${slug}`);
  return { success: en.admin.templates.saved };
}

export async function deleteTemplateAction(
  _previous: TemplateActionState,
  formData: FormData,
): Promise<TemplateActionState> {
  await requireAdmin(routes.adminTemplates);

  const slug = String(formData.get('slug') ?? '');
  const typed = String(formData.get('confirmSlug') ?? '').trim();

  if (typed !== slug) {
    return { fieldErrors: { confirmSlug: en.admin.templates.deleteConfirmMismatch } };
  }

  const template = await prisma.template.findUnique({ where: { slug } });
  if (!template) return { error: en.admin.templates.errors.notFound };

  await prisma.template.delete({ where: { slug } });

  // Best effort. An orphaned object costs a fraction of a cent; a failed delete
  // must not leave the admin staring at a row that will not go away.
  for (const key of [template.designKey, template.thumbnailKey]) {
    if (!key) continue;
    try {
      await deleteObject(key);
    } catch (error) {
      console.warn('[admin] could not delete template object', {
        key,
        message: error instanceof Error ? error.message : 'unknown error',
      });
    }
  }

  revalidatePath(routes.adminTemplates);
  redirect(routes.adminTemplates);
}
