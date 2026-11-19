// Writes scene.splat: a small procedural Gaussian splat scene (our own data, CC0),
// so the template needs no downloaded capture. Run: node make-splat.mjs [count] [out]
// (out defaults to scene.splat next to this script; tw new runs it for a new copy).
// Format (.splat, 32 bytes per splat, little endian): position float32 x3,
// scale float32 x3 (linear), colour RGBA uint8 x4 (A = opacity),
// rotation quaternion uint8 x4 stored as w, x, y, z with q = (byte - 128) / 128.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const COUNT = Number(process.argv[2] || 24000);

// mulberry32: small seeded generator, same file on every run.
let seed = 20260926;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const clamp8 = (v) => Math.max(0, Math.min(255, Math.round(v)));

// Quaternion turning +Z onto the unit normal n, so a flat splat lies on a surface.
function alignZ(nx, ny, nz) {
  if (nz < -0.9999) return [0, 1, 0, 0]; // w, x, y, z: half turn about X
  const w = 1 + nz, x = -ny, y = nx, len = Math.hypot(w, x, y);
  return [w / len, x / len, y / len, 0];
}

const buf = Buffer.alloc(COUNT * 32);
function write(i, [px, py, pz], [sx, sy, sz], [r, g, b, a], [qw, qx, qy, qz]) {
  const o = i * 32;
  buf.writeFloatLE(px, o); buf.writeFloatLE(py, o + 4); buf.writeFloatLE(pz, o + 8);
  buf.writeFloatLE(sx, o + 12); buf.writeFloatLE(sy, o + 16); buf.writeFloatLE(sz, o + 20);
  buf[o + 24] = clamp8(r); buf[o + 25] = clamp8(g); buf[o + 26] = clamp8(b); buf[o + 27] = clamp8(a);
  buf[o + 28] = clamp8(qw * 128 + 128); buf[o + 29] = clamp8(qx * 128 + 128);
  buf[o + 30] = clamp8(qy * 128 + 128); buf[o + 31] = clamp8(qz * 128 + 128);
}

// A ceramic-looking sphere, a ring of petals around it, and a mossy ground disc.
const nSphere = Math.floor(COUNT * 0.45), nRing = Math.floor(COUNT * 0.25), nGround = COUNT - nSphere - nRing;
let i = 0;
for (let k = 0; k < nSphere; k++, i++) {
  const u = rand() * 2 - 1, phi = rand() * Math.PI * 2, s = Math.sqrt(1 - u * u);
  const n = [s * Math.cos(phi), u, s * Math.sin(phi)];
  const band = 0.5 + 0.5 * Math.sin(u * 9); // glaze stripes
  const light = 0.55 + 0.45 * Math.max(0, n[0] * 0.4 + n[1] * 0.8 + n[2] * 0.4); // baked light
  const col = [(40 + 200 * band) * light, (90 + 90 * band) * light, (170 - 60 * band) * light, 235];
  write(i, [n[0] * 0.7, 0.9 + n[1] * 0.7, n[2] * 0.7], [0.035, 0.035, 0.004], col, alignZ(...n));
}
for (let k = 0; k < nRing; k++, i++) {
  const a = rand() * Math.PI * 2, petal = Math.pow(Math.abs(Math.cos(a * 4)), 0.6);
  const r = 0.85 + petal * 0.55 * rand();
  const p = [Math.cos(a) * r, 0.25 + (rand() - 0.5) * 0.06 + petal * 0.15 * (r - 0.85), Math.sin(a) * r];
  const warm = rand();
  write(i, p, [0.03, 0.03, 0.005], [230 + 25 * warm, 120 + 90 * warm * petal, 60 + 40 * petal, 210], alignZ(0, 1, 0));
}
for (let k = 0; k < nGround; k++, i++) {
  const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 2.2;
  const edge = Math.max(0, 1 - r / 2.2);
  const g = 0.6 + 0.4 * rand();
  write(i, [Math.cos(a) * r, rand() * 0.02, Math.sin(a) * r], [0.06, 0.06, 0.006],
    [40 * g, 95 * g, 55 * g, 60 + 190 * edge], alignZ(0, 1, 0));
}

const out = process.argv[3] || join(dirname(fileURLToPath(import.meta.url)), 'scene.splat');
writeFileSync(out, buf);
console.log(`wrote ${out}: ${COUNT} splats, ${buf.length} bytes`);
