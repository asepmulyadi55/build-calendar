import { prisma } from '@buildcalendar/db';
import { TemplateImportForm } from '@/components/admin/TemplateImportForm';
import { en } from '@/lib/i18n/en';

/**
 * File-based authoring (P1-US-702): the admin drops a Design JSON plus a
 * thumbnail and the panel imports them. The format is documented in
 * `docs/template-format.md`.
 */
export default async function ImportTemplatePage() {
  const presets = await prisma.productPreset.findMany({
    where: { isActive: true },
    orderBy: { sheetCount: 'desc' },
    select: { id: true, code: true, name: true, sheetCount: true },
  });

  return (
    <section className="admin-section">
      <div className="wrap">
        <span className="eyebrow">{en.admin.templates.eyebrow}</span>
        <h1 className="sec-title">{en.admin.templates.importTitle}</h1>
        <p className="lede admin-lede">{en.admin.templates.importLede}</p>
        <TemplateImportForm presets={presets} />
      </div>
    </section>
  );
}
