import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@buildcalendar/db';
import type { CalendarDesign } from '@buildcalendar/calendar-core';
import {
  NewProjectChooser,
  type PresetOption,
  type TemplateOption,
} from '@/components/projects/NewProjectChooser';
import { getObjectText } from '@/lib/storage/r2';
import { en } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';

export const metadata: Metadata = { title: en.newProject.titleFormat };

/** Offered years. A calendar is bought for next year, so that is the default. */
function offeredYears(): number[] {
  const next = new Date().getUTCFullYear() + 1;
  return [next, next + 1];
}

/**
 * `/app/new` — choose a format, then a design (P1-US-301, P1-US-302).
 *
 * A signed-out visitor may browse the whole page; the sign-in wall is at the
 * moment they pick a design, so nobody is asked to register before seeing what
 * they would get.
 */
export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params['template']) ? params['template'][0] : params['template'];
  const initialTemplateSlug = raw ?? null;

  const [presets, templates] = await Promise.all([
    prisma.productPreset.findMany({
      where: { isActive: true },
      orderBy: { sheetCount: 'desc' },
    }),
    // Only templates an admin has previewed and activated (P1-US-702).
    prisma.template.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
  ]);

  // The design is read here so the quick look can show every sheet. It is read
  // again at creation time — this copy is for display only and is never what
  // gets stored.
  const designs = await Promise.all(
    templates.map(async (template) => {
      try {
        return JSON.parse(await getObjectText(template.designKey)) as CalendarDesign;
      } catch (error) {
        console.error('[new] template design could not be read', {
          slug: template.slug,
          message: error instanceof Error ? error.message : 'unknown error',
        });
        return null;
      }
    }),
  );

  const presetOptions: PresetOption[] = presets.map((preset) => ({
    id: preset.id,
    code: preset.code,
    name: preset.name,
    description: en.products[preset.code]?.description ?? null,
    paperName: en.products[preset.code]?.paperName ?? null,
    widthMm: preset.widthMm,
    heightMm: preset.heightMm,
    sheetCount: preset.sheetCount,
  }));

  const templateOptions: TemplateOption[] = templates.map((template, index) => {
    const schema = template.slotSchema as { slots?: unknown[] } | null;
    return {
      slug: template.slug,
      name: template.name,
      category: template.category,
      // Placeholder artwork until real print photographs exist, same as the
      // public gallery. Swapping it is a data change.
      swatch: `s${(index % 8) + 1}`,
      isPremium: template.isPremium,
      productPresetId: template.productPresetId,
      slotCount: schema?.slots?.length ?? 0,
      design: designs[index] ?? null,
    };
  });

  return (
    <>
      <div className="topbar">
        <div>
          <div className="crumb">{en.newProject.crumbStep1}</div>
          <h1 className="page-title project-title">{en.newProject.titleFormat}</h1>
        </div>
        <div className="row">
          <Link href={routes.home} className="btn btn-ghost btn-sm">
            {en.newProject.cancel}
          </Link>
        </div>
      </div>

      <NewProjectChooser
        presets={presetOptions}
        templates={templateOptions}
        years={offeredYears()}
        initialTemplateSlug={initialTemplateSlug}
      />
    </>
  );
}
