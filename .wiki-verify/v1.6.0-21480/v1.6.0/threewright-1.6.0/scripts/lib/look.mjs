// tw look: score how close a render's colour grade is to a reference image, 0-100, from OKLab
// colour statistics (brightness, tint, chroma, hue, contrast, detail). Composition-independent:
// the camera does not have to match. Optional --fit writes a .cube LUT that moves the render's
// grade toward the reference. Idea from pittasavors7/RedditReferenceTest (MIT / Apache-2.0),
// re-implemented here; the weights below are threewright's own, checked on graded pairs (tests).

import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './png.mjs';

const BANDS = [0.25, 0.5, 0.75]; // L band edges: shadows, lower mids, upper mids, highlights
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function rgbToOklab(r, g, b) {
  r = lin(r); g = lin(g); b = lin(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

export function oklabToRgb(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [gam(clamp01(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)), gam(clamp01(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)), gam(clamp01(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s))];
}

// Image -> OKLab planes on a grid of at most ~maxPx pixels (nearest sampling keeps it fast).
export function toLab(img, maxPx = 160000) {
  const step = Math.max(1, Math.sqrt((img.width * img.height) / maxPx));
  const w = Math.max(1, Math.floor(img.width / step)), h = Math.max(1, Math.floor(img.height / step));
  const L = new Float32Array(w * h), A = new Float32Array(w * h), B = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (Math.floor(y * step) * img.width + Math.floor(x * step)) * 4, i = y * w + x;
    [L[i], A[i], B[i]] = rgbToOklab(img.data[o] / 255, img.data[o + 1] / 255, img.data[o + 2] / 255);
  }
  return { w, h, L, A, B };
}

const band = (l) => (l < BANDS[0] ? 0 : l < BANDS[1] ? 1 : l < BANDS[2] ? 2 : 3);

export function lookStats(lab) {
  const n = lab.L.length, hist = new Float64Array(64), hue = new Float64Array(12);
  const bands = [0, 1, 2, 3].map(() => ({ n: 0, a: 0, b: 0, c: 0 }));
  let sum = 0, sq = 0, hueW = 0, detail = 0;
  for (let i = 0; i < n; i++) {
    const l = lab.L[i], a = lab.A[i], b = lab.B[i], c = Math.hypot(a, b);
    hist[Math.min(63, Math.max(0, Math.floor(l * 64)))]++;
    sum += l; sq += l * l;
    const k = bands[band(l)]; k.n++; k.a += a; k.b += b; k.c += c;
    if (c > 0.03) { hue[Math.floor(((Math.atan2(b, a) / (2 * Math.PI) + 1) % 1) * 12) % 12] += c; hueW += c; }
  }
  for (let y = 0; y < lab.h - 1; y++) for (let x = 0; x < lab.w - 1; x++) {
    const i = y * lab.w + x;
    detail += Math.abs(lab.L[i] - lab.L[i + 1]) + Math.abs(lab.L[i] - lab.L[i + lab.w]);
  }
  for (const k of bands) if (k.n) { k.a /= k.n; k.b /= k.n; k.c /= k.n; k.share = k.n / n; } else k.share = 0;
  const mean = sum / n;
  return {
    hist: [...hist].map((v) => v / n), hue: [...hue].map((v) => (hueW ? v / hueW : 0)), bands,
    mean, contrast: Math.sqrt(Math.max(0, sq / n - mean * mean)),
    detail: detail / Math.max(1, (lab.w - 1) * (lab.h - 1)),
    chroma: bands.reduce((s, k) => s + k.c * k.share, 0),
  };
}

// Penalties in points; score = 100 * exp(-total / 60). Each part is reported so the user sees what to fix.
export function compareLooks(r, f) {
  let cr = 0, cf = 0, emd = 0;
  for (let i = 0; i < 64; i++) { cr += r.hist[i]; cf += f.hist[i]; emd += Math.abs(cr - cf) / 64; }
  let tint = 0, chroma = 0, w = 0;
  for (let i = 0; i < 4; i++) {
    const s = Math.min(r.bands[i].share, f.bands[i].share);
    if (!s) continue;
    tint += s * Math.hypot(r.bands[i].a - f.bands[i].a, r.bands[i].b - f.bands[i].b);
    chroma += s * Math.abs(r.bands[i].c - f.bands[i].c); w += s;
  }
  if (w) { tint /= w; chroma /= w; }
  const hue = r.hue.reduce((s, v, i) => s + Math.abs(v - f.hue[i]), 0) / 2;
  const rel = (x, y) => Math.abs(Math.log((x + 1e-3) / (y + 1e-3)));
  const parts = {
    brightness: emd * 250, // 0.1 of L shifted ~ 25 points
    tint: tint * 600, // 0.05 a/b ~ 30 points
    chroma: chroma * 400,
    hue: hue * 30 * Math.min(1, Math.min(r.chroma, f.chroma) / 0.04), // hue matters only where both have colour
    contrast: rel(r.contrast, f.contrast) * 40,
    detail: rel(r.detail, f.detail) * 15,
  };
  for (const k in parts) parts[k] = Math.round(parts[k] * 10) / 10;
  const total = Object.values(parts).reduce((s, v) => s + v, 0);
  return { score: Math.round(100 * Math.exp(-total / 60) * 10) / 10, parts };
}

export function lookScore(render, reference) {
  return compareLooks(lookStats(toLab(render)), lookStats(toLab(reference)));
}

// --- LUT fit: L by histogram matching, a/b by per-band mean shift and spread scale. ---
export function fitTransfer(render, reference) {
  const rl = toLab(render), fl = toLab(reference);
  const cdf = (L) => { const s = Float32Array.from(L).sort(); return (q) => s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
  const qr = cdf(rl.L), qf = cdf(fl.L), N = 64, map = [];
  for (let i = 0; i <= N; i++) map.push([qr(i / N), qf(i / N)]);
  // Slope limit keeps the curve monotone and avoids posterising: 0.4 to 2.5.
  for (let i = 1; i <= N; i++) {
    const dx = Math.max(1e-4, map[i][0] - map[i - 1][0]);
    map[i][1] = map[i - 1][1] + Math.min(2.5, Math.max(0.4, (map[i][1] - map[i - 1][1]) / dx)) * dx;
  }
  const mapL = (l) => {
    if (l <= map[0][0]) return map[0][1] + (l - map[0][0]);
    for (let i = 1; i <= N; i++) if (l <= map[i][0]) { const t = (l - map[i - 1][0]) / Math.max(1e-6, map[i][0] - map[i - 1][0]); return map[i - 1][1] + t * (map[i][1] - map[i - 1][1]); }
    return map[N][1] + (l - map[N][0]);
  };
  const ab = (lab) => [0, 1, 2, 3].map((k) => {
    let n = 0, a = 0, b = 0, va = 0, vb = 0;
    for (let i = 0; i < lab.L.length; i++) if (band(lab.L[i]) === k) { n++; a += lab.A[i]; b += lab.B[i]; va += lab.A[i] ** 2; vb += lab.B[i] ** 2; }
    if (!n) return null;
    a /= n; b /= n;
    return { a, b, sa: Math.sqrt(Math.max(1e-8, va / n - a * a)), sb: Math.sqrt(Math.max(1e-8, vb / n - b * b)) };
  });
  const sr = ab(rl), sf = ab(fl);
  const bandFit = sr.map((r, k) => (r && sf[k] ? { r, f: sf[k], ka: Math.min(2, Math.max(0.5, sf[k].sa / r.sa)), kb: Math.min(2, Math.max(0.5, sf[k].sb / r.sb)) } : null));
  return (R, G, B) => {
    const [l, a, b] = rgbToOklab(R, G, B);
    const L2 = clamp01(mapL(l));
    // Blend the two nearest bands' fits by L (band centres 0.125 ... 0.875) so no seam shows at an edge.
    const t = Math.min(3, Math.max(0, l * 4 - 0.5)), i0 = Math.floor(Math.min(2, t)), u = t - i0;
    const pick = (i) => bandFit[i] || bandFit.find(Boolean);
    const k0 = pick(i0), k1 = pick(i0 + 1);
    if (!k0) return oklabToRgb(L2, a, b);
    const ch = (k, x, c) => k.f[c] + (x - k.r[c]) * (c === 'a' ? k.ka : k.kb);
    return oklabToRgb(L2, (1 - u) * ch(k0, a, 'a') + u * ch(k1, a, 'a'), (1 - u) * ch(k0, b, 'b') + u * ch(k1, b, 'b'));
  };
}

export function buildLut(fn, size = 33) {
  const t = new Float32Array(size ** 3 * 3);
  for (let b = 0; b < size; b++) for (let g = 0; g < size; g++) for (let r = 0; r < size; r++) {
    const o = ((b * size + g) * size + r) * 3, v = fn(r / (size - 1), g / (size - 1), b / (size - 1));
    t[o] = v[0]; t[o + 1] = v[1]; t[o + 2] = v[2];
  }
  return { size, table: t };
}

export function lutToCube({ size, table }, title = 'threewright look fit') {
  const lines = [`TITLE "${title}"`, `LUT_3D_SIZE ${size}`];
  for (let i = 0; i < table.length; i += 3) lines.push(`${table[i].toFixed(6)} ${table[i + 1].toFixed(6)} ${table[i + 2].toFixed(6)}`);
  return lines.join('\n') + '\n';
}

// Trilinear lookup, the same as three.js LUTPass / the TSL lut3D node do on the GPU.
export function applyLut(img, { size, table }) {
  const out = Buffer.from(img.data), s = size - 1;
  const at = (r, g, b, c) => table[((b * size + g) * size + r) * 3 + c];
  for (let o = 0; o < out.length; o += 4) {
    const x = (img.data[o] / 255) * s, y = (img.data[o + 1] / 255) * s, z = (img.data[o + 2] / 255) * s;
    const x0 = Math.min(s - 1, Math.floor(x)), y0 = Math.min(s - 1, Math.floor(y)), z0 = Math.min(s - 1, Math.floor(z));
    const fx = x - x0, fy = y - y0, fz = z - z0;
    for (let c = 0; c < 3; c++) {
      const v = (1 - fz) * ((1 - fy) * ((1 - fx) * at(x0, y0, z0, c) + fx * at(x0 + 1, y0, z0, c)) + fy * ((1 - fx) * at(x0, y0 + 1, z0, c) + fx * at(x0 + 1, y0 + 1, z0, c)))
        + fz * ((1 - fy) * ((1 - fx) * at(x0, y0, z0 + 1, c) + fx * at(x0 + 1, y0, z0 + 1, c)) + fy * ((1 - fx) * at(x0, y0 + 1, z0 + 1, c) + fx * at(x0 + 1, y0 + 1, z0 + 1, c)));
      out[o + c] = Math.round(clamp01(v) * 255);
    }
  }
  return { width: img.width, height: img.height, data: out };
}

// Side-by-side sheet: images scaled (nearest) to one height, 8 px gaps.
export function sideBySide(imgs, height = 320) {
  const scaled = imgs.map((im) => ({ im, w: Math.max(1, Math.round((im.width * height) / im.height)) }));
  const width = scaled.reduce((s, x) => s + x.w, 0) + 8 * (imgs.length - 1);
  const data = Buffer.alloc(width * height * 4, 0);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  let x0 = 0;
  for (const { im, w } of scaled) {
    for (let y = 0; y < height; y++) for (let x = 0; x < w; x++) {
      const so = (Math.floor((y * im.height) / height) * im.width + Math.floor((x * im.width) / w)) * 4;
      im.data.copy(data, (y * width + x0 + x) * 4, so, so + 4);
    }
    x0 += w + 8;
  }
  return { width, height, data };
}

export async function cmdLook(a, print) {
  const [fr, ff] = a._.slice(1);
  if (!fr || !ff) throw new Error('look <render.png> <reference.png> [--min 70] [--sheet s.png] [--fit look.cube]');
  const render = decodePng(readFileSync(fr)), reference = decodePng(readFileSync(ff));
  const r = { ...lookScore(render, reference) };
  const shown = [reference, render];
  if (a.fit) {
    const lut = buildLut(fitTransfer(render, reference));
    writeFileSync(String(a.fit), lutToCube(lut));
    const graded = applyLut(render, lut);
    r.fit = { file: String(a.fit), size: lut.size, scoreAfter: lookScore(graded, reference).score };
    shown.push(graded);
  }
  if (a.sheet) { writeFileSync(String(a.sheet), encodePng(sideBySide(shown))); r.sheet = String(a.sheet); }
  if (a.min !== undefined) { r.min = Number(a.min); r.pass = r.score >= r.min; }
  print(r, a.json, (x) => [
    `look score ${x.score}/100${x.min !== undefined ? ` (min ${x.min}) ${x.pass ? 'PASS' : 'FAIL'}` : ''} · penalties: ${Object.entries(x.parts).map(([k, v]) => `${k} ${v}`).join(' · ')}`,
    x.fit ? `fitted LUT ${x.fit.file} (${x.fit.size}^3): score after ${x.fit.scoreAfter}/100` : '',
    x.sheet ? `wrote ${x.sheet} (reference | render${x.fit ? ' | render with LUT' : ''})` : '',
  ].filter(Boolean).join('\n'));
  if (r.pass === false) process.exitCode = 1;
}
