import Link from 'next/link';
import { prisma } from '@buildcalendar/db';
import { Badge, ButtonLink } from '@buildcalendar/ui';
import { en } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';

/** The template library (P1-US-702). */
export default async function AdminTemplatesPage() {
  const templates = await prisma.template.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { productPreset: { select: { code: true, name: true, sheetCount: true } } },
  });

  return (
    <section className="admin-section">
      <div className="wrap">
        <div className="admin-toolbar">
          <div>
            <span className="eyebrow">{en.admin.templates.eyebrow}</span>
            <h1 className="sec-title">{en.admin.templates.title}</h1>
            <p className="lede">{en.admin.templates.lede}</p>
          </div>
          <ButtonLink href={routes.adminTemplateNew} variant="primary">
            {en.admin.templates.importCta}
          </ButtonLink>
        </div>

        {templates.length === 0 ? (
          <div className="card">
            <p className="muted">{en.admin.templates.empty}</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{en.admin.templates.table.name}</th>
                  <th>{en.admin.templates.table.preset}</th>
                  <th>{en.admin.templates.table.category}</th>
                  <th>{en.admin.templates.table.slots}</th>
                  <th>{en.admin.templates.table.order}</th>
                  <th>{en.admin.templates.table.status}</th>
                  <th>{en.admin.templates.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => {
                  const schema = template.slotSchema as { slots?: unknown[] } | null;
                  return (
                    <tr key={template.id}>
                      <td>
                        <b>{template.name}</b>
                        <br />
                        <span className="mono muted">{template.slug}</span>
                      </td>
                      <td className="num">
                        {template.productPreset.code} · {template.productPreset.sheetCount}
                      </td>
                      <td>{template.category}</td>
                      <td className="num">{schema?.slots?.length ?? 0}</td>
                      <td className="num">{template.sortOrder}</td>
                      <td>
                        <Badge tone={template.isActive ? 'ok' : 'neutral'}>
                          {template.isActive
                            ? en.admin.templates.status.active
                            : en.admin.templates.status.inactive}
                        </Badge>
                      </td>
                      <td>
                        <Link className="mono" href={`${routes.adminTemplates}/${template.slug}`}>
                          {en.admin.templates.view}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
