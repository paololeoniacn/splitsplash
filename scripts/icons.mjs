// Renders the app icon (same geometry as public/favicon.svg) to PNG without native deps.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

function crc32(buf) {
  let c, crc = ~0;
  for (const b of buf) { c = (crc ^ b) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; }
  return ~crc >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, maskable) {
  const S = 4, raw = Buffer.alloc((size * 4 + 1) * size);
  const bg = [0x10, 0x20, 0x1b], fg = [0xf2, 0xf4, 0xf0], red = [0xdd, 0x52, 0x36];
  const scale = maskable ? 0.72 : 1;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0, 0];
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
        const u = ((x + (sx + 0.5) / S) / size) * 64, v = ((y + (sy + 0.5) / S) / size) * 64;
        const cu = 32 + (u - 32) / scale, cv = 32 + (v - 32) / scale;
        const r = 14, inRect = maskable || (Math.min(u, 64 - u) >= r || Math.min(v, 64 - v) >= r || Math.hypot(Math.min(u, 64 - u) - r, Math.min(v, 64 - v) - r) <= r);
        if (!inRect) continue;
        const d = Math.hypot(cu - 32, cv - 32);
        let col = bg;
        if (Math.abs(d - 21) <= 1.25 / scale * scale || (Math.abs(cu - 32) <= 1.25 && cv >= 11 && cv <= 53)) col = fg;
        if (d <= 9) col = red;
        acc[0] += col[0]; acc[1] += col[1]; acc[2] += col[2]; acc[3] += 255;
      }
      const n = S * S, o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = acc[0] / n; raw[o + 1] = acc[1] / n; raw[o + 2] = acc[2] / n; raw[o + 3] = acc[3] / n;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
writeFileSync('public/icon-192.png', png(192, false));
writeFileSync('public/icon-512.png', png(512, false));
writeFileSync('public/icon-maskable-512.png', png(512, true));
writeFileSync('public/apple-touch-icon.png', png(180, true));
