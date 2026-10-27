#!/usr/bin/env node
/**
 * Renders the PWA icons from one SVG source so the artwork lives in exactly one
 * place. Run with `npm run icons` after changing the design.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

const OUT_DIR = join(process.cwd(), "public", "icons");

/** Accent tile with a white check mark — legible at 48px and at 512px. */
function iconSvg({ size, padding }) {
  const inset = padding;
  const inner = size - padding * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="#1D4ED8"/>
  <g transform="translate(${inset} ${inset}) scale(${inner / 100})">
    <path d="M26 52 L44 70 L76 32" fill="none" stroke="#FFFFFF" stroke-width="11"
      stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
}

async function render(name, size, padding) {
  const svg = Buffer.from(iconSvg({ size, padding }));
  await sharp(svg).png().toFile(join(OUT_DIR, name));
  console.log(`[icons] wrote ${name} (${size}x${size})`);
}

mkdirSync(OUT_DIR, { recursive: true });

await render("icon-192.png", 192, 8);
await render("icon-512.png", 512, 24);
// Maskable icons must keep their content inside the 80% safe zone.
await render("icon-maskable-512.png", 512, 104);
