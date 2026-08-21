/**
 * Writes the home-screen icons. No image dependency: the flame is an analytic
 * shape, supersampled 4x4 and encoded straight to PNG.
 *
 *   npm run icons
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const EMBER = [0xd9, 0x45, 0x2a];
const EMBER_DEEP = [0x8e, 0x24, 0x13];
const CREAM = [0xfb, 0xf7, 0xf3];
const GOLD = [0xf6, 0xc8, 0x4c];

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/**
 * A candle flame in the unit square: rounded belly, tapering to a point.
 * `y` runs 0 at the flame's tip to 1 at its base.
 */
function flameHalfWidth(y, waist, width) {
  if (y <= 0 || y >= 1) return 0;
  if (y >= waist) {
    // Belly: a circular arc, so the bottom reads as round rather than blunt.
    const t = (y - waist) / (1 - waist);
    return width * Math.sqrt(Math.max(0, 1 - t * t));
  }
  // Taper: eased to a point so the tip stays sharp but not needle-thin.
  return width * Math.pow(y / waist, 0.48);
}

function inFlame(x, y, waist, width, lean) {
  const cx = 0.5 + lean * Math.pow(1 - y, 2.1);
  return Math.abs(x - cx) <= flameHalfWidth(y, waist, width);
}

function render(size, { bleed }) {
  // A maskable icon is cropped to a circle by the OS, so the mark shrinks.
  const pad = bleed ? 0.26 : 0.17;
  const px = Buffer.alloc(size * size * 4);
  const S = 4; // supersampling
  const inv = 1 / (S * S);

  for (let py = 0; py < size; py++) {
    for (let pxi = 0; pxi < size; pxi++) {
      let outer = 0;
      let inner = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const u = (pxi + (sx + 0.5) / S) / size;
          const v = (py + (sy + 0.5) / S) / size;
          // Map the padded box onto the flame's unit square.
          const fx = (u - pad) / (1 - 2 * pad);
          const fy = (v - pad) / (1 - 2 * pad);
          if (inFlame(fx, fy, 0.58, 0.305, 0.05)) outer++;
          // The inner core sits low and leans the other way — it is what makes
          // the mark read as fire and not as a leaf.
          if (inFlame(fx, (fy - 0.52) / 0.48, 0.56, 0.235, -0.07)) inner++;
        }
      }
      const a = outer * inv;
      const b = inner * inv;

      // Background: a soft ember gradient, corner to corner.
      const g = (pxi / size) * 0.45 + (py / size) * 0.55;
      let rgb = mix(EMBER, EMBER_DEEP, Math.min(1, g * 1.15));
      if (a > 0) rgb = mix(rgb, CREAM, a);
      if (b > 0) rgb = mix(rgb, GOLD, b * 0.92);

      const o = (py * size + pxi) * 4;
      px[o] = Math.round(rgb[0]);
      px[o + 1] = Math.round(rgb[1]);
      px[o + 2] = Math.round(rgb[2]);
      px[o + 3] = 255;
    }
  }
  return px;
}

/* ---- minimal PNG encoder ---- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // truecolour + alpha
  // 10..12: deflate, adaptive filtering, no interlace — all zero.

  // One filter byte (0 = none) per scanline.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });
for (const [name, size, opts] of [
  ['favicon.png', 64, { bleed: false }],
  ['icon-192.png', 192, { bleed: false }],
  ['icon-512.png', 512, { bleed: false }],
  ['icon-512-maskable.png', 512, { bleed: true }],
  ['apple-touch-icon.png', 180, { bleed: false }],
]) {
  const file = join(OUT, name);
  writeFileSync(file, png(size, render(size, opts)));
  console.log('wrote', name, size + 'px');
}
