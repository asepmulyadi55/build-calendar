import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Zero DOM dependencies is an acceptance criterion of P1-US-002, and the reason is
 * AR-01: this package runs in the browser editor and in the Node renderer, and both
 * must produce the same layout. A `document` reference would compile fine in the
 * editor and crash the renderer — or worse, silently diverge.
 *
 * `tsconfig.json` already omits the DOM lib, so a stray reference fails typecheck.
 * These tests guard the things the compiler cannot see: runtime globals reached
 * through `globalThis`, and dependencies added to package.json.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');

const sourceFiles = readdirSync(here)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
  .map((f) => ({ name: f, code: readFileSync(path.join(here, f), 'utf8') }));

const FORBIDDEN = [
  'document',
  'window',
  'navigator',
  'localStorage',
  'HTMLElement',
  'HTMLCanvasElement',
  'requestAnimationFrame',
  'getComputedStyle',
];

describe('zero DOM dependencies', () => {
  it('has source files to check', () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  it.each(FORBIDDEN)('never references %s', (identifier) => {
    const pattern = new RegExp(`\\b${identifier}\\b`);
    const offenders = sourceFiles
      .filter(({ code }) => pattern.test(stripComments(code)))
      .map(({ name }) => name);

    expect(offenders).toEqual([]);
  });

  it('declares no runtime dependencies at all', () => {
    const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };

    expect(pkg.dependencies ?? {}).toEqual({});
    expect(pkg.peerDependencies ?? {}).toEqual({});
  });

  it('imports nothing outside this package', () => {
    // Node built-ins would break the browser; workspace packages would create a
    // cycle back into the app layer and let English copy reach the printed sheet.
    const importPattern = /(?:^|\n)\s*import[^;]*?from\s+['"]([^'"]+)['"]/g;

    for (const { name, code } of sourceFiles) {
      for (const match of code.matchAll(importPattern)) {
        expect(match[1], `${name} imports ${match[1]}`).toMatch(/^\.\.?\//);
      }
    }
  });

  it('never reads a locale from the environment', () => {
    // calendar-core renders id-ID and only id-ID. Reading Intl defaults or a
    // process env would make output depend on the machine it runs on.
    for (const { name, code } of sourceFiles) {
      const stripped = stripComments(code);
      expect(stripped, name).not.toMatch(/\bIntl\b/);
      expect(stripped, name).not.toMatch(/process\.env/);
      expect(stripped, name).not.toMatch(/toLocaleDateString|toLocaleString/);
    }
  });
});

function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}
