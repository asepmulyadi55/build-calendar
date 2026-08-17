import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const css = readFileSync(path.join(here, 'components.css'), 'utf8');

/**
 * `components.css` is a copy of `design/assets/ds.css` and is consumed alongside
 * Tailwind. Tailwind ships single-word utilities — `.grid`, `.flex`, `.table`,
 * `.block`, `.hidden` — and where ds.css uses one of those names without setting
 * `display` itself, the utility wins and silently changes the layout.
 *
 * That happened once: the calendar's `<table class="grid">` became a grid
 * container and all seven day columns collapsed into one. This test exists so it
 * cannot happen again unnoticed.
 */
const TAILWIND_DISPLAY_UTILITIES = [
  'grid',
  'flex',
  'table',
  'block',
  'inline',
  'hidden',
  'contents',
];

/** Crude but sufficient: split the stylesheet into `selector { declarations }`. */
function rules(stylesheet: string): { selector: string; declarations: string }[] {
  const withoutComments = stylesheet.replace(/\/\*[\s\S]*?\*\//g, '');
  const parsed: { selector: string; declarations: string }[] = [];

  for (const block of withoutComments.split('}')) {
    const open = block.indexOf('{');
    if (open === -1) continue;
    parsed.push({
      selector: block.slice(0, open).trim(),
      declarations: block.slice(open + 1),
    });
  }

  return parsed;
}

describe('components.css', () => {
  it('sets an explicit display on the calendar table', () => {
    expect(css).toContain('table.grid{display:table;');
  });

  it('declares display for every selector whose class collides with a Tailwind utility', () => {
    const offenders: string[] = [];

    for (const { selector, declarations } of rules(css)) {
      // Only the element the rule actually targets matters. `table.grid th`
      // styles a `th`, which never carries `class="grid"`.
      const collides = selector.split(',').some((single) => {
        const parts = single.trim().split(/[\s>+~]+/);
        const target = parts[parts.length - 1] ?? '';
        return TAILWIND_DISPLAY_UTILITIES.some((utility) => target.endsWith(`.${utility}`));
      });

      if (!collides) continue;
      if (!/(^|;)\s*display\s*:/.test(declarations)) offenders.push(selector);
    }

    expect(offenders).toEqual([]);
  });

  it('still carries the design tokens it was copied against', () => {
    expect(css).toContain('var(--merah)');
    expect(css).toContain('var(--paper)');
    // Colours belong in theme.css; a literal here means the copy has drifted.
    expect(css).not.toMatch(/#d8232a/i);
  });
});
