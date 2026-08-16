# Print pipeline spike — P1-US-000

Throwaway. Not architected, not tested, not merged. Delete this directory once
`docs/DECISIONS.md` records the findings.

It answers two questions with numbers:

1. Can Puppeteer produce a genuinely print-ready PDF? (exact page size, vector text)
2. Does it fit in 1 GB of RAM?

The written answer is in [REPORT.md](REPORT.md). Raw numbers are in `out/`.

## Requirements

Docker. Nothing else — Node, Chromium, the fonts and the placeholder photo all live
inside the image.

## Run it

```bash
cd spike
docker build -t buildcalendar-spike .
bash bench.sh                 # both formats, 1 GB cap, then verification
```

`bench.sh` needs bash (Git Bash on Windows is fine). It:

1. runs `docker run -m 1g` once per format, polling `docker stats` for peak RSS,
2. copies the PDFs and JSON out of the container,
3. runs the verifier and renders low-res PNG previews of each PDF.

### Individual pieces

```bash
# render only, one format
docker run --rm -m 1g buildcalendar-spike node src/render.js a3
docker run --rm -m 1g buildcalendar-spike node src/render.js a2

# repeat the same job N times in one worker — shows memory growth between jobs
docker run --rm -m 1g -e REPEAT=8 buildcalendar-spike node src/render.js a2

# verify PDFs already in ./out
docker run --rm -m 1g buildcalendar-spike node src/verify.js
```

Environment knobs: `MEM` (default `1g`), `REPEAT` (default `3` under `bench.sh`),
`SINGLE_PROCESS=1` to add Chromium's `--single-process`, `CHROME_PATH` to run outside
Docker.

### Why `docker cp` and not a bind mount

On the owner's Windows host, `-v D:/...:/app/out` silently resolves somewhere other
than the project directory — the container sees its own writes, the host never does.
`bench.sh` copies results out instead. A bind mount would also add page-cache noise to
the memory measurement.

## What is in here

| File | Purpose |
|---|---|
| `src/calendar.js` | Indonesian month/weekday tables, 6×7 Monday-start matrix, January 2027 holiday |
| `src/sheet.js` | Product sizes, and the SVG → HTML page at exact mm size |
| `src/render.js` | sharp pre-size → Chromium on demand → `page.pdf()` → kill Chromium |
| `src/verify.js` | MediaBox in mm, text extraction, embedded image resolution |
| `src/photo.js` | Builds the 6000 × 4500 stand-in for an R2 print derivative, at image build time |
| `src/mem.js` | Reads the cgroup memory counter from inside the container |
| `bench.sh` | The 1 GB harness |
| `out/` | PDFs, PNG previews, `bench.csv`, `render-*.json`, `verify.json` |

## What this spike deliberately does not do

- No Prisma, Supabase, Next.js, BullMQ, R2 or `calendar-core`. The Indonesian tables
  are duplicated here on purpose so nothing real can grow a dependency on spike code.
- No multi-sheet merge with `pdf-lib`. RQ-MEM-02 keeps peak memory flat regardless of
  sheet count, so one sheet is the number that matters.
- No crop marks. With only 3 mm of bleed there is no room to place them outside the
  trim line; that is a conversation with the print shop, not a memory question.
- The physical print-shop check in P1-US-000 is still outstanding. This spike produces
  the file to take there.
