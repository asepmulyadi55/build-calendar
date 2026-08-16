// Creates the fixture that stands in for an R2 print derivative: a 6000 x 4500 JPEG.
// Generated once at Docker image build time so its memory cost is NOT counted in the
// measured render. The render job then downscales it with sharp, which is what the
// real pipeline does (RQ-MEM-03).

import { mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import sharp from 'sharp';

export const FIXTURE = new URL('../fixtures/source.jpg', import.meta.url).pathname;

const W = 6000;
const H = 4500;

async function main() {
  const out = process.argv[2] || FIXTURE;
  if (existsSync(out)) {
    console.log(`fixture already present: ${out}`);
    return;
  }
  mkdirSync(dirname(out), { recursive: true });

  // Small noise seed upscaled so the JPEG carries realistic entropy and file size.
  const seedW = 750;
  const seedH = 563;
  const noise = Buffer.alloc(seedW * seedH * 3);
  for (let i = 0; i < noise.length; i += 3) {
    const v = 90 + Math.floor(Math.random() * 130);
    noise[i] = v;
    noise[i + 1] = Math.min(255, v + 25);
    noise[i + 2] = Math.max(0, v - 35);
  }

  const gradient = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
       <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
         <stop offset="0%" stop-color="#ff9a3c" stop-opacity="0.55"/>
         <stop offset="55%" stop-color="#1f6f8b" stop-opacity="0.45"/>
         <stop offset="100%" stop-color="#0b2b3a" stop-opacity="0.65"/>
       </linearGradient></defs>
       <rect width="${W}" height="${H}" fill="url(#g)"/>
     </svg>`,
  );

  await sharp(noise, { raw: { width: seedW, height: seedH, channels: 3 } })
    .resize(W, H, { kernel: 'lanczos3' })
    .composite([{ input: gradient, blend: 'over' }])
    .jpeg({ quality: 85, mozjpeg: false })
    .toFile(out);

  const meta = await sharp(out).metadata();
  console.log(`fixture written: ${out} ${meta.width}x${meta.height}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
