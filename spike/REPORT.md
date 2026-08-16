# P1-US-000 — Print pipeline spike: findings

Measured 16 August 2026. Windows 11 host, Docker Desktop 29.6.1, WSL2 backend,
`node:20-bookworm-slim`, Debian Chromium 151, Puppeteer `page.pdf()` (Skia/PDF m151).
Every number below comes from a container started with `docker run -m 1g`.

**Both questions answer yes.** The vector path produces a correctly sized, selectable-text
PDF, and the heaviest page in the catalogue renders inside 1 GB with room to spare.
Three things need a decision before P1-US-601 is written; they are at the end.

---

## 1. Is the PDF genuinely print-ready?

### Page dimensions — exact

| Format | Target (trim + 3 mm bleed) | Measured MediaBox | Delta | Within ±0.5 mm |
|---|---|---|---|---|
| A3 sheet | 303 × 426 mm | 858.96 × 1207.92 pt = **303.02 × 426.13 mm** | +0.02 / +0.13 mm | yes |
| A2 single sheet | 426 × 600 mm | 1207.92 × 1700.88 pt = **426.13 × 600.03 mm** | +0.13 / +0.03 mm | yes |

The residue is PDF point quantisation, not a layout error: `@page { size: 303mm 426mm }`
converts to 858.898 pt and Skia writes 858.96 pt. Worst case 0.13 mm — roughly a
quarter of the 0.5 mm tolerance P1-US-603 sets, and far below what a guillotine holds.

### Text is vector

Both PDFs extract **52 text objects** each, across **three embedded font subsets**.
Everything the story requires is present and selectable:

```
Januari 2027 | 297 × 420 mm + 3 mm bleed | Sen | Sel | Rab | Kam | Jum | Sab | Min | 28 | 29 | 30 | 31 | 1
```

`out/verify.json` asserts each of `Januari`, `2027`, `Sen`, `Sel`, `Rab`, `Kam`, `Jum`,
`Sab`, `Min`, `Tahun Baru Masehi` — all present in both files. Sundays and 1 January
are red; leading and trailing days are grey; week starts Monday.

### One raster object per page, at full resolution

| Format | Photo slot at 300 DPI | Embedded in PDF as | Effective DPI |
|---|---|---|---|
| A3 | 3579 × 2943 px | 3579 × 2943, `DCTDecode` | 300 |
| A2 | 5031 × 4146 px | 5031 × 4146, `DCTDecode` | 300 |

`DCTDecode` at exactly the input pixel dimensions means Chromium passed the JPEG
through rather than re-encoding or downsampling it, and confirms Skia did **not**
rasterise the page — there is one image on the page, and it is the photo.

PDF version 1.4, tagged, uncompressed, no JavaScript, no encryption. Files:
`out/a3-303x426mm.pdf` (1.7 MB), `out/a2-426x600mm.pdf` (2.7 MB).
Low-res PNG previews of both are next to them.

**Not yet answered:** nobody has printed these. The physical print-shop check is the
remaining half of P1-US-000's exit criteria — colour, trim alignment, text sharpness,
and whether the shop accepts an RGB PDF. The A3 file is ready to take there.

---

## 2. Does it fit in 1 GB?

`docker run -m 1g`, no OOM kill, exit 0, in every run below.

### Cold worker — one job, process starts and exits

| Format | Container RSS before job | Peak during job | Kernel `memory.peak` | Wall time |
|---|---|---|---|---|
| A3 | 28 MB | **219 MB** | 287 MB | 2.1 s |
| A2 | 30 MB | **229 MB** | 331 MB | 2.7 s |

### Warm worker — third consecutive job in the same process

This is the real production shape: one long-lived BullMQ worker, Chromium killed
between jobs but Node never restarting.

| Format | RSS between jobs | Peak during job | Kernel `memory.peak` | `docker stats` peak |
|---|---|---|---|---|
| A3 | 125 MB | **375 MB** | 449 MB | 356 MiB |
| A2 | 109 MB | **393 MB** | 512 MB | 377 MiB |

Sustained over eight A2 jobs it plateaus and stays there: worker RSS flat at 221 MB
from job 3 onward, job peak ~430 MB, no growth to job 8.

Two caveats on the numbers. `docker stats --no-stream` costs about a second per call
and a render takes two, so it caught only 4–9 samples and reads low; the in-container
cgroup sampler at 100 ms is the number to trust. And the kernel's `memory.peak`
includes page cache — real, but reclaimable under pressure, not the same kind of
memory as the worker's own RSS.

### Against the §4.2 budget

| Component | §4.2 expected | Measured | |
|---|---|---|---|
| Chromium + decoded image, together | 300–400 MB + ~24 MB | +199 MB over idle (A2, cold job) | under |
| Same, warm worker | — | +284 MB over between-job RSS (A2) | at the top of the range |
| Renderer container, cold job | — | **219–229 MB** | |
| Renderer container, warm steady state | implied ≤ 500 MB (RQ-MEM-06 cap) | **393–430 MB** | fits, thin |
| Idle subtotal (OS + Next.js + Redis + Caddy) | ~600 MB | not measured — no app exists yet | |
| **Peak during render** | **~950 MB** | **~600 MB idle + ~430 MB = ~1030 MB** | see below |

The renderer half of the budget is comfortably correct. The whole-box figure is not
provable yet, because the other 600 MB is Next.js and Redis, which do not exist.
Substituting the spike's measured 430 MB into §4.2's own estimate puts the box at
roughly 1030 MB — about 80 MB over, absorbed by the 2 GB swap file RQ-MEM-05 already
requires. That is the expected shape, not a surprise, but it means **the whole-box
measurement has to be repeated once Next.js is running**. Nothing in the degradation
plan needs to be applied today.

---

## 3. Three things to decide before writing P1-US-601

### 3.1 `MALLOC_ARENA_MAX=2` is not optional

Without it, the worker's RSS climbs job after job while the JS heap stays flat at
18 MB — 110 → 190 → 260 → 312 MB over eight A2 renders, still rising. sharp releases
its buffers; glibc keeps them in per-thread arenas and never returns them to the OS.

| Configuration | Worker RSS, jobs 1 → 8 |
|---|---|
| Default | 110 → 312 MB, still climbing |
| `sharp.cache(false)` before first use | 109 → 261 MB, plateaus at job 6 |
| Both, plus `MALLOC_ARENA_MAX=2` | 109 → **221 MB, flat from job 3** |

Both are in the spike's Dockerfile and `render.js`. On a 1 GB box the difference
between a bounded 221 MB worker and one that is still growing at job 8 is the whole
question. `sharp.cache(false)` must run before the first sharp operation, not after —
calling it afterwards does nothing.

### 3.2 A 4000 px print-derivative cap cannot feed an A2 at 300 DPI

The A2 photo slot needs **5031 × 4146 px**. §4.2's first degradation step proposes
capping derivatives at a 4000 px long edge; 4000 px across 426 mm is **238 DPI**, and
the 3000 px variant is 179 DPI. The cap has to be at least 5031 px for A2, or A2 ships
at a lower stated DPI, or A2 is deferred (degradation step 3). Memory is not the
constraint that forces this — the A2 render has headroom — so the honest options are
"raise the cap" or "drop A2", not "shrink the image to save memory".

### 3.3 `mem_limit: 500m` for the renderer is tight

Warm A2 peaks at 393–430 MB of non-cache memory against RQ-MEM-06's 500 MB cap.
It fits, but a heavier template — more text objects, a second image — could not.
Suggest 600m, or keep 500m knowingly. Either way it is an ADR, not a silent choice.

---

## Not done

- **Physical print.** P1-US-000 is not closed until an A3 comes back from a print shop
  and looks sellable. The file is in `out/`.
- **`docs/DECISIONS.md` is untouched.** Findings 3.1–3.3 are each a judgement call the
  owner should make and record; writing them as ADRs is the next action, not something
  this spike should decide on its own.
- **Whole-box measurement** with Next.js and Redis running, per §4.2.

## What a reviewer should check by hand

Open `out/a3-303x426mm.pdf` in Adobe Reader: confirm Document Properties reports
303 × 426 mm, and drag-select "Januari 2027" and "Tahun Baru Masehi" to confirm the
text is live rather than part of the photo. Then re-run
`docker run --rm -m 1g -e REPEAT=8 buildcalendar-spike node src/render.js a2` and check
that `node rss` in the per-run lines stops rising by the third job.
