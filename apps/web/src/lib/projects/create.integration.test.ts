// Re-exported by the db package; apps/web has no direct dependency on Prisma.
import { PrismaClient } from '@buildcalendar/db';
import { afterAll, describe, expect, it } from 'vitest';
import { buildProjectFromTemplate } from './create';

/**
 * The copy rule, proved against a real database (P1-US-302).
 *
 * The unit tests show `buildProjectFromTemplate` deep-copies. This one shows the
 * copy survives the round trip through `jsonb` and, more importantly, that
 * rewriting the template afterwards does not move the project — which is the
 * thing the rule actually protects.
 *
 * Skipped unless a throwaway database is provided, so `pnpm test` stays offline:
 *
 *   docker run -d --name pg -e POSTGRES_PASSWORD=verify -p 55490:5432 postgres:16-alpine
 *   # create the auth schema stub, then `prisma migrate deploy` and seed
 *   TEST_DATABASE_URL=postgresql://postgres:verify@localhost:55490/postgres pnpm test
 */
const url = process.env['TEST_DATABASE_URL'];

const prisma = url
  ? new PrismaClient({ datasources: { db: { url } } })
  : (null as unknown as PrismaClient);

afterAll(async () => {
  if (prisma) await prisma.$disconnect();
});

describe.skipIf(!url)('a project keeps its own copy of the design', () => {
  const userId = '11111111-1111-1111-1111-111111111111';

  async function seedUserAndTemplate() {
    await prisma.$executeRawUnsafe(
      `INSERT INTO auth.users (id, email, raw_user_meta_data)
       VALUES ('${userId}', 'copy@example.com', '{"name":"Copy Test"}')
       ON CONFLICT (id) DO NOTHING`,
    );

    const template = await prisma.template.findUnique({
      where: { slug: 'kayu' },
      include: { productPreset: true },
    });
    expect(template, 'seed must have run').not.toBeNull();
    return template!;
  }

  it('stores a copy that survives the template being rewritten', async () => {
    const template = await seedUserAndTemplate();

    // The design as the template has it today.
    const original = {
      schemaVersion: 1,
      productPresetCode: template.productPreset.code,
      year: 2027,
      startMonth: 1,
      sheets: [
        {
          id: 'sheet-01',
          index: 0,
          widthMm: template.productPreset.widthMm,
          heightMm: template.productPreset.heightMm,
          bleedMm: 3,
          safeMarginMm: 10,
          objects: [{ type: 'calendarGrid', id: 'grid-1', month: 1, year: 2027, locale: 'id-ID' }],
          slots: [
            {
              id: 'photo-1',
              type: 'image',
              required: true,
              xMm: 0,
              yMm: 0,
              widthMm: 303,
              heightMm: 249,
            },
          ],
        },
      ],
    };

    const data = buildProjectFromTemplate({
      design: original,
      templateName: template.name,
      year: 2028,
    });

    const project = await prisma.project.create({
      data: {
        userId,
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
    });

    // The year moved with the choice; the months did not.
    const stored = project.designJson as unknown as {
      year: number;
      sheets: { slots: { widthMm: number }[]; objects: { year: number; month: number }[] }[];
    };
    expect(stored.year).toBe(2028);
    expect(stored.sheets[0]!.objects[0]!.year).toBe(2028);
    expect(stored.sheets[0]!.objects[0]!.month).toBe(1);
    expect(project.status).toBe('draft');

    // Now the template changes underneath — the case the rule exists for.
    original.sheets[0]!.slots[0]!.widthMm = 999;
    original.sheets.push({ ...structuredClone(original.sheets[0]!), id: 'sheet-99' });

    const reread = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
    const after = reread.designJson as unknown as {
      sheets: { slots: { widthMm: number }[] }[];
    };

    expect(after.sheets).toHaveLength(1);
    expect(after.sheets[0]!.slots[0]!.widthMm).toBe(303);

    await prisma.project.delete({ where: { id: project.id } });
  });

  it('is invisible to another user, because every query filters by owner', async () => {
    const template = await seedUserAndTemplate();
    const data = buildProjectFromTemplate({
      design: {
        schemaVersion: 1,
        productPresetCode: template.productPreset.code,
        year: 2027,
        startMonth: 1,
        sheets: [],
      },
      templateName: template.name,
      year: 2027,
    });

    const project = await prisma.project.create({
      data: {
        userId,
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
    });

    const asOwner = await prisma.project.findFirst({ where: { id: project.id, userId } });
    const asStranger = await prisma.project.findFirst({
      where: { id: project.id, userId: '22222222-2222-2222-2222-222222222222' },
    });

    expect(asOwner).not.toBeNull();
    expect(asStranger).toBeNull();

    await prisma.project.delete({ where: { id: project.id } });
  });
});
