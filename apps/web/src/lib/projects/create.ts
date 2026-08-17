import type { CalendarDesign } from '@buildcalendar/calendar-core';

/**
 * Turning a template into a project (P1-US-302).
 *
 * The rule this file exists to enforce: selecting a template **copies** its Design
 * JSON. It is never a reference. A later edit to the template must not alter a
 * calendar somebody already built, and once one is unlocked, that calendar is
 * something they paid for.
 *
 * Pure functions, so the copy semantics are testable without a database.
 */
export interface NewProjectData {
  title: string;
  year: number;
  startMonth: number;
  designJson: CalendarDesign;
  schemaVersion: number;
  designBytes: number;
  status: 'draft';
}

function assertDesign(candidate: unknown): asserts candidate is CalendarDesign {
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    throw new TypeError('template design must be an object');
  }
}

/** `{TemplateName} {Year}` (P1-US-303). */
export function defaultProjectTitle(templateName: string, year: number): string {
  return `${templateName.trim()} ${String(year)}`;
}

/**
 * Rewrites the year without touching the input.
 *
 * A template is authored for one year; a user picking 2028 needs every calendar
 * grid moved with it. Months stay where the designer put them.
 */
export function retargetDesignYear(design: CalendarDesign, year: number): CalendarDesign {
  // `CalendarDesign` is deeply readonly, which is right for callers but not for a
  // clone we own outright. The cast is confined to this function.
  const copy = structuredClone(design) as unknown as {
    year: number;
    sheets: { objects: Record<string, unknown>[] }[];
  };

  copy.year = year;
  for (const sheet of copy.sheets) {
    for (const object of sheet.objects) {
      if (object['type'] === 'calendarGrid') object['year'] = year;
    }
  }

  return copy as unknown as CalendarDesign;
}

export function buildProjectFromTemplate({
  design,
  templateName,
  year,
}: {
  design: unknown;
  templateName: string;
  year: number;
}): NewProjectData {
  assertDesign(design);

  // `structuredClone` rather than a spread: a shallow copy would leave sheets,
  // slots and grid objects shared with the template, which is exactly the bug
  // this rule exists to prevent.
  const copied = retargetDesignYear(structuredClone(design), year);
  const serialised = JSON.stringify(copied);

  return {
    title: defaultProjectTitle(templateName, year),
    year,
    startMonth: typeof copied.startMonth === 'number' ? copied.startMonth : 1,
    designJson: copied,
    schemaVersion: typeof copied.schemaVersion === 'number' ? copied.schemaVersion : 1,
    // Tracked so design growth can be measured against the 500 MB quota (§3.2).
    designBytes: Buffer.byteLength(serialised, 'utf8'),
    status: 'draft',
  };
}
