import { describe, expect, it } from 'vitest';
import { buildProjectFromTemplate, defaultProjectTitle, retargetDesignYear } from './create';

/**
 * P1-US-302's load-bearing rule: selecting a template **copies** its Design JSON
 * into the project. It is never a reference.
 *
 * If it were a reference, editing a template would silently rewrite calendars
 * people had already built — and once one is unlocked, that is something they paid
 * for. This is the kind of bug nobody notices until a customer's December photo
 * moves.
 */
/** A hand-written stand-in for JSON parsed out of R2, so it is deliberately loose. */
const templateDesign = {
  schemaVersion: 1,
  productPresetCode: 'WALL-12',
  year: 2027,
  startMonth: 1,
  sheets: [
    {
      id: 'sheet-01',
      index: 0,
      widthMm: 297,
      heightMm: 420,
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
} as const;

type MutableDesign = {
  year: number;
  startMonth: number;
  schemaVersion: number;
  sheets: {
    id: string;
    slots: { id: string; widthMm: number }[];
    objects: { type: string; month: number; year: number }[];
  }[];
};

const fixture = () => structuredClone(templateDesign) as unknown as MutableDesign;
const asDesign = (value: unknown) => value as never;

describe('buildProjectFromTemplate', () => {
  it('deep-copies the design rather than referencing it', () => {
    const source = fixture();
    const project = buildProjectFromTemplate({
      design: source,
      templateName: 'Kayu',
      year: 2027,
    });

    expect(project.designJson).toEqual(source);
    // Same value, different object graph — all the way down.
    expect(project.designJson).not.toBe(source);
    expect((project.designJson as unknown as MutableDesign).sheets).not.toBe(source.sheets);
    expect((project.designJson as unknown as MutableDesign).sheets[0]).not.toBe(source.sheets[0]);
    expect((project.designJson as unknown as MutableDesign).sheets[0]!.slots).not.toBe(
      source.sheets[0]!.slots,
    );
  });

  it('survives the template being mutated afterwards', () => {
    const source = fixture();
    const project = buildProjectFromTemplate({ design: source, templateName: 'Kayu', year: 2027 });

    // Simulate an admin re-importing the template with a different layout.
    source.sheets[0]!.slots[0]!.widthMm = 999;
    source.sheets.push({ ...structuredClone(source.sheets[0]!), id: 'sheet-99' });

    expect((project.designJson as unknown as MutableDesign).sheets).toHaveLength(1);
    expect((project.designJson as unknown as MutableDesign).sheets[0]!.slots[0]!.widthMm).toBe(303);
  });

  it('is not affected by mutating the copy either — the template is safe both ways', () => {
    const source = fixture();
    const project = buildProjectFromTemplate({ design: source, templateName: 'Kayu', year: 2027 });

    (project.designJson as unknown as MutableDesign).sheets[0]!.slots[0]!.widthMm = 111;

    expect(source.sheets[0]!.slots[0]!.widthMm).toBe(303);
  });

  it('carries the schema version from the design, so a migrator knows what it has', () => {
    const project = buildProjectFromTemplate({
      design: fixture(),
      templateName: 'Kayu',
      year: 2027,
    });
    expect(project.schemaVersion).toBe(1);
  });

  it('measures the stored design so growth can be tracked against the quota', () => {
    const project = buildProjectFromTemplate({
      design: fixture(),
      templateName: 'Kayu',
      year: 2027,
    });

    expect(project.designBytes).toBe(Buffer.byteLength(JSON.stringify(project.designJson), 'utf8'));
    expect(project.designBytes).toBeGreaterThan(0);
  });

  it('starts as a draft — nothing is unlocked until a coin is spent', () => {
    const project = buildProjectFromTemplate({
      design: fixture(),
      templateName: 'Kayu',
      year: 2027,
    });
    expect(project.status).toBe('draft');
  });

  it('rejects a design that is not an object', () => {
    for (const bad of [null, undefined, 'text', 42, []]) {
      expect(() =>
        buildProjectFromTemplate({ design: bad, templateName: 'Kayu', year: 2027 }),
      ).toThrow(/design/i);
    }
  });
});

describe('retargetDesignYear', () => {
  it('rewrites the year on the design and on every calendar grid', () => {
    const design = fixture();
    const moved = retargetDesignYear(asDesign(design), 2028) as unknown as MutableDesign;

    expect(moved.year).toBe(2028);
    expect((moved.sheets[0]!.objects[0] as { year: number }).year).toBe(2028);
  });

  it('does not touch the input', () => {
    const design = fixture();
    retargetDesignYear(asDesign(design), 2028);

    expect(design.year).toBe(2027);
    expect((design.sheets[0]!.objects[0] as { year: number }).year).toBe(2027);
  });

  it('leaves months alone — only the year moves', () => {
    const moved = retargetDesignYear(asDesign(fixture()), 2028) as unknown as MutableDesign;
    expect((moved.sheets[0]!.objects[0] as { month: number }).month).toBe(1);
  });
});

describe('defaultProjectTitle', () => {
  it('is "{TemplateName} {Year}" per P1-US-303', () => {
    expect(defaultProjectTitle('Kayu', 2027)).toBe('Kayu 2027');
    expect(defaultProjectTitle('Batik Modern', 2028)).toBe('Batik Modern 2028');
  });

  it('trims a sloppy template name', () => {
    expect(defaultProjectTitle('  Kayu  ', 2027)).toBe('Kayu 2027');
  });
});
