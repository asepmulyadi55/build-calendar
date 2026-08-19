import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * RQ-MEM — the release blocker.
 *
 * The A2 single sheet (`WALL-1`, 420 × 594 mm trim, 3 mm bleed) is the heaviest
 * page in the catalogue: a 426 × 600 mm page whose photo slot needs 5031 px across
 * at 300 DPI. Production is a 1 GB Lightsail box. If this render does not complete
 * under `docker run -m 1g`, the product does not ship on the planned instance.
 *
 * The spike (P1-US-000) measured a warm A2 job peaking at 393–430 MB. This test
 * does not re-measure that; it asserts the thing that matters — the job completes,
 * inside the cap, without an OOM kill — and prints the peak so a regression is
 * visible in CI output rather than only when the box falls over.
 *
 * Slow by design: it builds the renderer image. Gated behind an environment
 * variable so `pnpm test` stays fast, and wired to `pnpm test:memory` and CI.
 */
const REPO_ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const IMAGE = 'buildcalendar-renderer:memtest';

function hasDocker(): boolean {
  const result = spawnSync('docker', ['version', '--format', '{{.Server.Os}}'], {
    encoding: 'utf8',
  });
  return result.status === 0;
}

const enabled = process.env.RENDERER_MEMORY_TEST === '1';
const available = enabled && hasDocker();

describe.skipIf(!available)('RQ-MEM — A2 single sheet renders inside 1 GB', () => {
  it('builds the renderer image', () => {
    execFileSync('docker', ['build', '-f', 'infra/Dockerfile.renderer', '-t', IMAGE, '.'], {
      cwd: REPO_ROOT,
      stdio: 'inherit',
    });
  });

  it('completes the render under `docker run -m 1g` without an OOM kill', () => {
    // `--network none` is the strongest possible form of the story's "no outbound
    // network access during rendering": the container cannot reach anything at all.
    // If the pipeline ever starts fetching a font or an image at render time, this
    // fails here rather than in production.
    const result = spawnSync(
      'docker',
      [
        'run',
        '--rm',
        '-m',
        '1g',
        '--network',
        'none',
        '-e',
        'RENDER_FIXTURE_PRESET=WALL-1',
        IMAGE,
        'node',
        'dist/bin/render-fixture.js',
      ],
      { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
    );

    // Print the measurement so CI output carries the number, not just a tick.
    // eslint-disable-next-line no-console -- the peak RSS is the point of this test
    if (result.stdout) console.log(result.stdout);
    if (result.status !== 0 && result.stderr) console.error(result.stderr);

    // 137 is SIGKILL, which under `-m 1g` means the kernel OOM killer took it.
    expect(result.status, 'exit code (137 means the container was OOM-killed)').toBe(0);

    const report = JSON.parse(
      result.stdout.slice(result.stdout.lastIndexOf('{'), result.stdout.lastIndexOf('}') + 1),
    ) as {
      ok: boolean;
      pages: number;
      pageWidthMm: number;
      pageHeightMm: number;
      peakRssMb: number;
      textObjects: number;
      embeddedFonts: string[];
      substitutedFonts: string[];
    };

    expect(report.ok).toBe(true);

    // One sheet in, one page out (RQ-MEM-02 renders them one at a time).
    expect(report.pages).toBe(1);

    // Trim plus bleed on both axes, within the 0.5 mm tolerance P1-US-603 sets.
    expect(report.pageWidthMm).toBeCloseTo(426, 0);
    expect(report.pageHeightMm).toBeCloseTo(600, 0);

    // Text must survive as vector. A rasterised page embeds no fonts at all.
    expect(report.textObjects).toBeGreaterThan(0);

    // Every embedded font must be one the image installs. A substitution here means
    // FONT_ALLOWLIST and infra/Dockerfile.renderer have drifted apart, which is a
    // release blocker (`01-…` §5.5) and is invisible until something is printed.
    expect(report.substitutedFonts, `embedded: ${report.embeddedFonts.join(', ')}`).toEqual([]);

    // Headroom check. The spike measured 393–430 MB warm; production also has to
    // fit Next.js and Redis on the same box, so a peak near the cap is a warning
    // even when the job succeeds.
    expect(report.peakRssMb).toBeLessThan(700);
  });
});
