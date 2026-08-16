// Builds one calendar sheet as SVG, then embeds that SVG in an HTML page whose
// @page size is the exact trim+bleed size in millimetres.
// This is the vector path from P1-US-601: SVG -> HTML -> page.pdf().
// All coordinates are millimetres. The SVG viewBox maps 1 user unit = 1 mm.

import {
  MONTHS_ID,
  WEEKDAYS_ID_SHORT,
  HOLIDAYS_2027_01,
  buildMonthMatrix,
  resolveHolidays,
} from './calendar.js';

const BLEED_MM = 3;

// Only the two presets the spike needs. The real app reads these from product_presets.
export const PRESETS = {
  a3: {
    id: 'a3',
    label: 'A3 wall calendar sheet',
    trimW: 297,
    trimH: 420,
    bleed: BLEED_MM,
    photoRatio: 0.585, // fraction of page height taken by the full-bleed photo
    safeInset: 10, // extra margin inside the trim line
  },
  a2: {
    id: 'a2',
    label: 'A2 single sheet (heaviest page in the catalogue)',
    trimW: 420,
    trimH: 594,
    bleed: BLEED_MM,
    photoRatio: 0.585,
    safeInset: 13,
  },
};

export function pageSize(preset) {
  return {
    w: preset.trimW + preset.bleed * 2,
    h: preset.trimH + preset.bleed * 2,
  };
}

/** Pixel dimensions the photo slot needs at 300 DPI (RQ-MEM-03). */
export function photoSlotPx(preset, dpi = 300) {
  const { w, h } = pageSize(preset);
  const slotWmm = w;
  const slotHmm = round1(h * preset.photoRatio);
  return {
    slotWmm,
    slotHmm,
    width: Math.round((slotWmm / 25.4) * dpi),
    height: Math.round((slotHmm / 25.4) * dpi),
  };
}

const round1 = (n) => Math.round(n * 10) / 10;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const RED = '#c0392b';
const INK = '#1a1a1a';
const MUTED = '#9aa0a6';
const RULE = '#d8dadd';

function buildGridSvg(year, month, area, scale) {
  const matrix = buildMonthMatrix(year, month);
  const holidays = resolveHolidays(HOLIDAYS_2027_01);

  const colW = area.w / 7;
  const headerH = 9 * scale;
  const rowH = (area.h - headerH) / 6;

  const parts = [];

  // Weekday header. Bahasa Indonesia, Monday first.
  WEEKDAYS_ID_SHORT.forEach((label, i) => {
    const cx = area.x + colW * i + colW / 2;
    parts.push(
      `<text x="${round1(cx)}" y="${round1(area.y + headerH * 0.65)}" text-anchor="middle" ` +
        `font-size="${round1(5 * scale)}" font-weight="600" letter-spacing="${round1(0.3 * scale)}" ` +
        `fill="${i === 6 ? RED : INK}">${label}</text>`,
    );
  });

  parts.push(
    `<line x1="${round1(area.x)}" y1="${round1(area.y + headerH)}" ` +
      `x2="${round1(area.x + area.w)}" y2="${round1(area.y + headerH)}" ` +
      `stroke="${INK}" stroke-width="${round1(0.45 * scale)}"/>`,
  );

  matrix.forEach((row, r) => {
    const rowTop = area.y + headerH + rowH * r;

    if (r > 0) {
      parts.push(
        `<line x1="${round1(area.x)}" y1="${round1(rowTop)}" ` +
          `x2="${round1(area.x + area.w)}" y2="${round1(rowTop)}" ` +
          `stroke="${RULE}" stroke-width="${round1(0.2 * scale)}"/>`,
      );
    }

    row.forEach((cell, c) => {
      const cx = area.x + colW * c + colW / 2;
      const baseline = rowTop + rowH * 0.62;
      const holiday = holidays.get(cell.date);
      const isRed = cell.isSunday || Boolean(holiday);

      let fill = INK;
      if (!cell.inMonth) fill = MUTED;
      else if (isRed) fill = RED;

      parts.push(
        `<text x="${round1(cx)}" y="${round1(baseline)}" text-anchor="middle" ` +
          `font-size="${round1(9 * scale)}" fill="${fill}">${cell.day}</text>`,
      );

      if (cell.inMonth && holiday) {
        parts.push(
          `<text x="${round1(cx)}" y="${round1(baseline + 4.2 * scale)}" text-anchor="middle" ` +
            `font-size="${round1(2.6 * scale)}" fill="${RED}">${esc(holiday[0].name)}</text>`,
        );
      }
    });
  });

  return parts.join('\n      ');
}

/**
 * @param {object} opts
 * @param {object} opts.preset
 * @param {number} opts.year
 * @param {number} opts.month 1-12
 * @param {string} opts.photoHref file:// URL of the pre-sized photo
 */
export function buildSheetHtml({ preset, year, month, photoHref }) {
  const { w: W, h: H } = pageSize(preset);
  const { slotHmm } = photoSlotPx(preset);
  const scale = W / 303; // A3 sheet is the reference; A2 type scales up with it

  const margin = preset.bleed + preset.safeInset;
  const titleY = slotHmm + 22 * scale;
  const gridArea = {
    x: margin,
    y: titleY + 10 * scale,
    w: W - margin * 2,
    h: H - (titleY + 10 * scale) - margin - 8 * scale,
  };

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">
  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>

  <!-- Photo slot: full bleed on top, left and right edges -->
  <image x="0" y="0" width="${W}" height="${round1(slotHmm)}"
         preserveAspectRatio="xMidYMid slice" xlink:href="${photoHref}"/>

  <!-- Month title. Bahasa Indonesia, printed side. -->
  <text x="${margin}" y="${round1(titleY)}" font-size="${round1(14 * scale)}" font-weight="700"
        fill="${INK}">${MONTHS_ID[month - 1]} ${year}</text>
  <text x="${round1(W - margin)}" y="${round1(titleY)}" text-anchor="end"
        font-size="${round1(5 * scale)}" fill="${MUTED}">${preset.trimW} × ${preset.trimH} mm + ${preset.bleed} mm bleed</text>

  <g font-family="'DejaVu Sans', sans-serif">
      ${buildGridSvg(year, month, gridArea, scale)}
  </g>
</svg>`;

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<style>
  @page { size: ${W}mm ${H}mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  svg { display: block; font-family: 'DejaVu Sans', sans-serif; }
</style>
</head>
<body>
${svg}
</body>
</html>`;
}
