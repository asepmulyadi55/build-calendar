import { notFound } from 'next/navigation';
import { prisma } from '@buildcalendar/db';
import { Badge } from '@buildcalendar/ui';
import type { CalendarDesign } from '@buildcalendar/calendar-core';
import { DesignSchematic } from '@/components/admin/SheetSchematic';
import { TemplateDetailForms } from '@/components/admin/TemplateDetailForms';
import { getObjectText } from '@/lib/storage/r2';
import { en } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';

/**
 * One template: its metadata, the slot schema derived at import, and a preview of
 * every sheet drawn to scale.
 *
 * P1-US-702 requires previewing before activating, which is why a template lands
 * inactive and this page is the only place it can be switched on.
 */
export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const template = await prisma.template.findUnique({
    where: { slug },
    include: { productPreset: true },
  });
  if (!template) notFound();

  // The design lives in R2 (AR-07); the database holds only the key.
  let design: CalendarDesign | null = null;
  try {
    design = JSON.parse(await getObjectText(template.designKey)) as CalendarDesign;
  } catch (error) {
    console.error('[admin] could not read template design', {
      slug,
      message: error instanceof Error ? error.message : 'unknown error',
    });
  }

  const schema = template.slotSchema as {
    slots?: { id: string; type: string; required: boolean }[];
  };

  return (
    <section className="admin-section">
      <div className="wrap">
        <span className="eyebrow">{en.admin.templates.detailEyebrow}</span>
        <div className="row-between">
          <h1 className="sec-title">{template.name}</h1>
          <Badge tone={template.isActive ? 'ok' : 'neutral'}>
            {template.isActive
              ? en.admin.templates.status.active
              : en.admin.templates.status.inactive}
          </Badge>
        </div>
        <p className="lede admin-lede">
          {template.productPreset.name} · {template.productPreset.code} ·{' '}
          {template.productPreset.widthMm} × {template.productPreset.heightMm} mm ·{' '}
          {template.productPreset.sheetCount} {en.home.types.sheetsSuffix}
        </p>

        <div className="admin-detail">
          <div>
            <b className="h3">{en.admin.templates.previewHeading}</b>
            <p className="muted small admin-lede">{en.admin.templates.previewLede}</p>

            {design ? (
              <DesignSchematic design={design} label={en.admin.templates.previewSheet} />
            ) : (
              <div className="card">
                <p className="muted">{en.admin.templates.errors.notFound}</p>
              </div>
            )}

            <div className="admin-slot-schema">
              <b className="h3">{en.admin.templates.slotSchemaHeading}</b>
              <p className="muted small admin-lede">{en.admin.templates.slotSchemaLede}</p>
              <div className="table-scroll">
                <table className="tbl">
                  <tbody>
                    {(schema.slots ?? []).map((slot) => (
                      <tr key={slot.id}>
                        <td className="mono">{slot.id}</td>
                        <td>{slot.type}</td>
                        <td className="num">{String(slot.required)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <aside>
            {template.thumbnailKey ? (
              // Streamed through our own route: the bucket stays private (NFR-S04).
              <img
                className="admin-thumb"
                src={`${routes.adminTemplates}/${template.slug}/thumbnail`}
                alt={template.name}
              />
            ) : (
              <div className="card">
                <p className="muted small">{en.admin.templates.previewNoThumbnail}</p>
              </div>
            )}

            <TemplateDetailForms
              slug={template.slug}
              name={template.name}
              category={template.category}
              sortOrder={template.sortOrder}
              isPremium={template.isPremium}
              isActive={template.isActive}
            />
          </aside>
        </div>
      </div>
    </section>
  );
}
