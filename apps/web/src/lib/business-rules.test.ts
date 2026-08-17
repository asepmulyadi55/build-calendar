import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { en } from './i18n/en';

/**
 * Guards the business rules Epic 1 touches. These are source-level checks on
 * purpose: the rules are about what must NOT be baked into the code, and that is
 * not observable by rendering a component.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(here, '..');
const CONTENT = path.resolve(SRC, 'content');

/**
 * These checks are about what ships, so they read code with comments removed.
 * A comment explaining why "Januari" must not be typed here is not the same thing
 * as typing it.
 */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function walk(dir: string, extensions: string[]): { file: string; code: string }[] {
  const out: { file: string; code: string }[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full, extensions));
      continue;
    }
    if (!extensions.some((ext) => entry.endsWith(ext))) continue;
    if (entry.endsWith('.test.ts') || entry.endsWith('.test.tsx')) continue;
    const raw = readFileSync(full, 'utf8');
    out.push({
      file: path.relative(SRC, full),
      code: entry.endsWith('.mdx') ? raw : stripComments(raw),
    });
  }
  return out;
}

const sources = walk(SRC, ['.ts', '.tsx']);
const legal = walk(CONTENT, ['.mdx']);
const allCopy = [JSON.stringify(en), ...legal.map((f) => f.code)].join('\n');

describe('BR-C01 — coin packages are never hardcoded', () => {
  // "Other packages are admin-configurable, never hardcoded." The prices exist in
  // `coin_packages`; a literal here would mean the admin panel silently lies.
  const PRICES = ['10000', '10_000', '25000', '25_000', '50000', '50_000'];
  const COIN_AMOUNTS = /\b(5|15|35)\s*coins\b/i;

  it('no source file contains a package price literal', () => {
    const offenders = sources
      .filter(({ file }) => !file.startsWith('lib' + path.sep + 'format'))
      .filter(({ code }) => PRICES.some((price) => new RegExp(`\\b${price}\\b`).test(code)))
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  it('no source file hardcodes a coin amount as copy', () => {
    const offenders = sources.filter(({ code }) => COIN_AMOUNTS.test(code)).map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it('en.ts holds no package name, price, or coin count', () => {
    expect(JSON.stringify(en)).not.toMatch(/Rp\s?\d/);
    expect(JSON.stringify(en)).not.toMatch(COIN_AMOUNTS);
  });
});

describe('BR-C02 — coins never expire, and the site says so', () => {
  it('states it somewhere a visitor will read', () => {
    expect(allCopy).toMatch(/never expire|coins never expire/i);
  });

  it('never states an expiry', () => {
    // "Do coins expire?" is a question a visitor asks and the site answers with
    // "Never". What must not appear is an affirmative expiry claim.
    expect(allCopy).not.toMatch(/coins? (?:will|shall|may) expire/i);
    expect(allCopy).not.toMatch(/coins? expires? (?:after|in|within|on)\b/i);
    expect(allCopy).not.toMatch(/valid for \d+ (?:days|months|years)/i);
    expect(allCopy).not.toMatch(/expiry date/i);
  });
});

describe('BR-C03 — coins are non-refundable, stated before purchase', () => {
  it('the refund policy says it plainly', () => {
    const refunds = legal.find(({ file }) => file.includes('refund'));
    expect(refunds, 'a refund policy page must exist').toBeDefined();
    expect(refunds!.code).toMatch(/non-refundable/i);
    expect(refunds!.code).toMatch(/coins?/i);
  });

  it('the terms mention it too, since that is what a buyer agrees to', () => {
    const terms = legal.find(({ file }) => file.includes('terms'));
    expect(terms, 'a terms page must exist').toBeDefined();
    expect(terms!.code).toMatch(/non-refundable|cannot be (?:refunded|converted)/i);
  });

  it('print-order refunds are scoped to production defects, not change of mind', () => {
    const refunds = legal.find(({ file }) => file.includes('refund'));
    expect(refunds!.code).toMatch(/production defect/i);
  });
});

describe('P1-US-104 — the WhatsApp number comes from settings', () => {
  it('no source file contains a literal Indonesian mobile number', () => {
    const offenders = sources
      .filter(({ code }) => /\b(?:\+?62|0)8\d{8,11}\b/.test(code.replace(/[\s-]/g, '')))
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  it('no source file hardcodes a wa.me link with a number in it', () => {
    const offenders = sources.filter(({ code }) => /wa\.me\/\d/.test(code)).map(({ file }) => file);

    expect(offenders).toEqual([]);
  });
});

describe('the language split holds on public pages', () => {
  // Master spec §10.7. Indonesian belongs on the printed sheet, not in the chrome.
  const INDONESIAN_CALENDAR_WORDS = [
    'Januari',
    'Februari',
    'Maret',
    'Agustus',
    'Oktober',
    'Desember',
    'Senin',
    'Selasa',
    'Minggu',
  ];

  it('en.ts carries no calendar vocabulary', () => {
    const copy = JSON.stringify(en);
    const found = INDONESIAN_CALENDAR_WORDS.filter((word) =>
      new RegExp(`\\b${word}\\b`).test(copy),
    );
    expect(found).toEqual([]);
  });

  it('the hero calendar mockup renders through calendar-core, not hardcoded strings', () => {
    // The mockup is a picture of printed output, so its month and weekday labels
    // are Indonesian and must come from the one engine (AR-01). Typing "Januari"
    // into a component is how the two layers start to disagree.
    const mockup = sources.find(({ file }) => file.includes('CalendarMockup'));
    expect(mockup, 'the hero mockup component must exist').toBeDefined();
    expect(mockup!.code).toMatch(/@buildcalendar\/calendar-core/);
  });

  it('no component types an Indonesian month or weekday name directly', () => {
    const offenders = sources
      .filter(({ file }) => file.startsWith('components') || file.startsWith('app'))
      .filter(({ code }) =>
        INDONESIAN_CALENDAR_WORDS.some((word) => new RegExp(`['"\`]${word}`).test(code)),
      )
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });
});

describe('design tokens', () => {
  it('no component hardcodes a hex colour', () => {
    // Every colour lives in packages/ui/src/theme.css, copied from ds.css.
    const offenders = sources
      .filter(({ file }) => file.startsWith('components') || file.startsWith('app'))
      .filter(({ code }) =>
        /#[0-9a-fA-F]{3,8}\b/.test(code.replace(/#[0-9a-fA-F]*['"]?\s*\}/g, '')),
      )
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });
});
