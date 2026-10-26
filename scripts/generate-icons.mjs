#!/usr/bin/env node
// Generates the PWA icon set from the brand mark's geometry.
//
// Kept in-repo and dependency-free so the icons can be regenerated when the
// brand palette changes (npm run icons). Outputs are committed under public/.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = `${root}/public`;

const PINE = [31, 77, 58];
const CREAM = [246, 241, 231];
const BRASS = [166, 118, 61];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Pointy-top hexagon, same proportions as the in-app logo
// (M16 2.5 L28 9.25 V22.75 L16 29.5 L4 22.75 V9.25 Z).
function hexagon(cx, cy, radius) {
  const points = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (-90 + i * 60) * (Math.PI / 180);
    points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
  }
  return points;
}

function distanceToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  const x = ax + t * dx;
  const y = ay + t * dy;
  return Math.hypot(px - x, py - y);
}

function inPolygon(px, py, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function renderIcon(size, { maskable = false } = {}) {
  const supersample = 4;
  const big = size * supersample;
  const pixels = Buffer.alloc(size * size * 4);

  const center = big / 2;
  // Maskable icons need the mark inside the safe zone (80% of the canvas).
  const radius = big * (maskable ? 0.29 : 0.36);
  const stroke = big * 0.045;
  const hex = hexagon(center, center, radius);
  const dot = [center + radius * Math.cos(-Math.PI / 6), center + radius * Math.sin(-Math.PI / 6)];
  const dotRadius = big * 0.055;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;

      for (let sy = 0; sy < supersample; sy += 1) {
        for (let sx = 0; sx < supersample; sx += 1) {
          const px = x * supersample + sx + 0.5;
          const py = y * supersample + sy + 0.5;

          let color = PINE;
          const onEdge = hex.some((point, index) => {
            const next = hex[(index + 1) % hex.length];
            return distanceToSegment(px, py, point, next) <= stroke / 2;
          });
          if (onEdge) color = CREAM;
          if (inPolygon(px, py, hex) && Math.hypot(px - dot[0], py - dot[1]) <= dotRadius) color = BRASS;

          r += color[0];
          g += color[1];
          b += color[2];
        }
      }

      const samples = supersample * supersample;
      const offset = (y * size + x) * 4;
      pixels[offset] = Math.round(r / samples);
      pixels[offset + 1] = Math.round(g / samples);
      pixels[offset + 2] = Math.round(b / samples);
      pixels[offset + 3] = 255;
    }
  }

  return encodePng(size, pixels);
}

mkdirSync(outDir, { recursive: true });
const outputs = [
  ['pwa-192x192.png', 192, {}],
  ['pwa-512x512.png', 512, {}],
  ['pwa-maskable-512x512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, {}],
];

for (const [name, size, options] of outputs) {
  writeFileSync(`${outDir}/${name}`, renderIcon(size, options));
  console.log(`✓ public/${name}`);
}
