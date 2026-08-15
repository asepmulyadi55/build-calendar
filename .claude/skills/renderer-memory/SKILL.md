---
name: renderer-memory
description: "Procedure for any work on the renderer, Puppeteer, Chromium, PDF export, preview generation, image processing with sharp, or the BullMQ queue. Trigger whenever a task mentions export, render, PDF, preview, Chromium, or memory. Production runs on a 1 GB server and these constraints are what make that viable."
---

# Working on the renderer

Production is a 1 GB AWS Lightsail instance (ADR-0002). Idle usage is around 600 MB, so a render has roughly 350 MB of headroom. Every constraint below looks like an inefficiency and is not.

Read `docs/01-tech-stack-and-infrastructure.md` §4.2 before changing anything in `apps/renderer`.

## The eight requirements

- **RQ-MEM-01 — Chromium launches per job and is killed after 60s idle.** Never keep a warm browser pool. This keeps 300-400 MB out of the idle footprint and discards leaks between jobs. The ~1s cold start is the price and it is worth paying.
- **RQ-MEM-02 — One sheet at a time.** Render each sheet to a single-page PDF, merge with `pdf-lib`. Never build all sheets in memory.
- **RQ-MEM-03 — Resize with `sharp` before Chromium sees the image.** Downscale to exactly the pixels the slot needs at 300 DPI. A 4000 px source for a 1500 px slot costs 48 MB decoded instead of 7 MB.
- **RQ-MEM-04 — BullMQ concurrency is `1`.** Do not raise it. If throughput becomes a problem, that is an instance-size decision requiring a new ADR.
- **RQ-MEM-05 — 2 GB swap must exist on the host.** Swap turns an OOM kill into slow completion. Without it the OOM killer targets the largest process, which is Next.js, and one export takes down the whole website.
- **RQ-MEM-06 — Docker `mem_limit` per service:** web 400m, renderer 500m, redis 64m.
- **RQ-MEM-07 — Chromium flags:** `--disable-dev-shm-usage`, `--disable-gpu`, `--no-sandbox`, `--js-flags="--max-old-space-size=256"`.
- **RQ-MEM-08 — 5 minute job timeout,** after which the job fails cleanly and Chromium is killed.

## Output correctness

- Vector path only: build SVG, embed in HTML at exact mm page size, then `page.pdf({ preferCSSPageSize: true, printBackground: true })`. Never screenshot a page and wrap the raster in a PDF.
- Page size is trim **plus bleed on all four sides**.
- Fonts are baked into the Docker image. Adding a font to the editor picker without rebuilding the image is a release blocker.
- No outbound network access during rendering. This prevents SSRF and guarantees deterministic output.

## Before reporting done

- [ ] `docker run -m 1g` completes an A2 single-sheet render
- [ ] Peak RSS recorded and compared against the §4.2 budget
- [ ] Text in the output PDF is selectable, proving it stayed vector
- [ ] Page dimensions verified in points, within 0.5 mm
- [ ] The CI memory regression test passes
