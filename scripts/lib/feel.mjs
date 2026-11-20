// tw feel: measure how a game feels from a scripted run, frame by frame, as numbers.
//
// The page runs on tw's virtual clock (performance.now, Date.now and requestAnimationFrame
// are replaced), so tw steps it one frame at a time and reads every frame: a small
// screenshot (pixels) and, on a three.js page, the main camera (position, rotation, FOV).
// Input from --actions is sent at its scheduled time, between frames.
//
// What it reports:
//   input to response   per key or click: frames and ms until the watched region changes
//                       (each --box, else the whole frame) and, on a three.js page, until the
//                       camera leaves its extrapolated path by 0.05 and 0.5 units
//   freezes             runs of 2 or more identical frames inside motion (hit-stop)
//   flashes             frames where mean brightness jumps 100 or more (0-255): peak, hold,
//                       fade length and shape; FAIL above 3 flashes in any 1 s
//   shake               camera: position residual after a centred 9-frame median, grouped into
//                       bursts (start, frames, ms, peak units, peak px at the subject depth,
//                       peak degrees); pixels (--pixels or no camera): phase correlation of
//                       a band between frames, detrended with a centred median, bursts in px
//   FOV                 min and max over the run
//   boxes               per --box: rise to 63% and 90% after a key goes down, decay after it
//                       comes up, curve shape (linear, ease-in, exponential), update period
//   camera hides player with --player "<js>" (an Object3D, or [x,y,z]): share of frames where
//                       a mesh's world box lies between camera and player (box test, not
//                       triangles; boxes holding both camera and player, such as rooms and
//                       skies, are ignored); FAIL above 2% or a run over 1 s
//   probe               with --probe "<css selector>": spans of each class on that element
//
// Methods written fresh for threewright from technique-harvest notes on published web games
// (2026-11): input marker timing, freeze, flash and shake reads, camera logging, phase
// correlation for Canvas 2D, rise/decay and flash-rate reads, camera occlusion share.
// No game code was read or copied. The camera is read through tw's per-instance
// renderer.render wrapper: three r169+ assigns render on each WebGLRenderer instance, so
// a hook on the prototype never fires.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { keyInfo, parseActions, runActions } from './actions.mjs';
import { decodePng } from './png.mjs';
import { digestLogs, evalWithTarget, openPage } from './page.mjs';

// ---------- small statistics ----------

export const median = (xs) => {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return NaN;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

// Centred moving mean (window w, odd), truncated at the ends.
export function movingMean(xs, w = 9) {
  const h = w >> 1;
  return xs.map((_, i) => {
    let s = 0, n = 0;
    for (let j = Math.max(0, i - h); j <= Math.min(xs.length - 1, i + h); j++) { s += xs[j]; n++; }
    return s / n;
  });
}

export function movingMedian(xs, w = 7) {
  const h = w >> 1;
  return xs.map((_, i) => median(xs.slice(Math.max(0, i - h), i + h + 1)));
}

// Group frame indices where flag[i] is true into runs, joining gaps of up to `gap` frames.
export function groupRuns(flags, gap = 0) {
  const out = [];
  let cur = null;
  for (let i = 0; i < flags.length; i++) {
    if (!flags[i]) continue;
    if (cur && i - cur.end - 1 <= gap) cur.end = i;
    else { cur = { start: i, end: i }; out.push(cur); }
  }
  return out;
}

// ---------- shake ----------

// residual[i] >= 0 (units or px). Bursts: frames above max(factor x median, floor), joined
// over gaps of 2 frames, then trimmed to the frames at 10% of the burst's peak or more.
export function shakeBursts(residual, { factor = 6, floor = 0.01, gap = 2, cut = Infinity } = {}) {
  const usable = residual.map((r) => (Number.isFinite(r) && r < cut ? r : 0));
  const thr = Math.max(factor * median(usable), floor);
  const bursts = [];
  for (const g of groupRuns(usable.map((r) => r > thr), gap)) {
    let peak = 0, at = g.start;
    for (let i = g.start; i <= g.end; i++) if (usable[i] > peak) { peak = usable[i]; at = i; }
    let s = g.start, e = g.end;
    while (s < e && usable[s] < 0.1 * peak) s++;
    while (e > s && usable[e] < 0.1 * peak) e--;
    // extend over neighbours that still carry 10% of the peak (the threshold may cut them)
    while (s > 0 && usable[s - 1] >= 0.1 * peak) s--;
    while (e < usable.length - 1 && usable[e + 1] >= 0.1 * peak) e++;
    bursts.push({ start: s, end: e, frames: e - s + 1, peak, peakAt: at });
  }
  // merge bursts the extension made overlap
  const merged = [];
  for (const b of bursts) {
    const last = merged[merged.length - 1];
    if (last && b.start <= last.end + 1) { last.end = Math.max(last.end, b.end); last.frames = last.end - last.start + 1; if (b.peak > last.peak) { last.peak = b.peak; last.peakAt = b.peakAt; } }
    else merged.push({ ...b });
  }
  return { threshold: thr, bursts: merged };
}

// Camera residuals: position minus a centred moving median, and rotation angle (degrees)
// from a centred mean quaternion.
export function cameraResiduals(cams, w = 9) {
  const n = cams.length;
  const comp = (k) => cams.map((c) => c.p[k]);
  // A centred median, not a mean: a mean spreads a shake into the frames around it.
  const mx = movingMedian(comp(0), w), my = movingMedian(comp(1), w), mz = movingMedian(comp(2), w);
  const h = w >> 1, edge = (i) => i < h || i >= n - h; // no full window at the ends: no reading
  const pos = cams.map((c, i) => (edge(i) ? 0 : Math.hypot(c.p[0] - mx[i], c.p[1] - my[i], c.p[2] - mz[i])));
  // align quaternion signs to the first, then average componentwise
  const qs = cams.map((c) => c.q.slice());
  for (let i = 1; i < n; i++) { const d = qs[i].reduce((s, v, k) => s + v * qs[i - 1][k], 0); if (d < 0) qs[i] = qs[i].map((v) => -v); }
  const mq = [0, 1, 2, 3].map((k) => movingMean(qs.map((q) => q[k]), w));
  const rot = qs.map((q, i) => {
    if (edge(i)) return 0;
    const a = [mq[0][i], mq[1][i], mq[2][i], mq[3][i]];
    const len = Math.hypot(...a) || 1;
    const d = Math.min(1, Math.abs(q.reduce((s, v, k) => s + v * a[k] / len, 0)));
    return 2 * Math.acos(d) * 180 / Math.PI;
  });
  return { pos, rot };
}

// ---------- freezes, flashes, periods, curves ----------

// diffs[i]: mean abs difference of frame i against frame i-1 (diffs[0] = NaN).
// A freeze is a run of >= minFrames frames with diff <= still, inside motion: the median
// diff of the 8 frames before it and of the 8 after it are above `moving`.
export function freezeRuns(diffs, { still = 0.02, moving = 0.1, minFrames = 2 } = {}) {
  const out = [];
  for (const g of groupRuns(diffs.map((d, i) => i > 0 && d <= still))) {
    const len = g.end - g.start + 1;
    if (len < minFrames) continue;
    const before = median(diffs.slice(Math.max(1, g.start - 8), g.start));
    const after = median(diffs.slice(g.end + 1, g.end + 9));
    if (!(before > moving) || !(after > moving)) continue;
    out.push({ start: g.start, frames: len });
  }
  return out;
}

// luma[i]: mean brightness 0-255 per frame. A flash starts where it jumps by >= jump.
// hold: frames at >= 98% of the rise; fade: ms from the end of the hold to <= 2% (linear
// interpolation between frames); frames: frames above 10%; shape of the fade.
export function findFlashes(luma, dt, { jump = 100 } = {}) {
  const out = [];
  for (let i = 1; i < luma.length; i++) {
    if (luma[i] - luma[i - 1] < jump) continue;
    const base = luma[i - 1];
    let k = i, peak = luma[i];
    while (k + 1 < luma.length && luma[k + 1] > peak) { k++; peak = luma[k]; }
    const y = (j) => (luma[j] - base) / (peak - base || 1);
    let h = k;
    while (h + 1 < luma.length && y(h + 1) >= 0.98) h++;
    let e = h;
    while (e + 1 < luma.length && y(e + 1) > 0.02) e++;
    let fadeMs = null;
    if (e + 1 < luma.length) {
      const y0 = y(e), y1 = y(e + 1);
      const frac = y0 === y1 ? 0 : (y0 - 0.02) / (y0 - y1);
      fadeMs = (e - h + frac) * dt;
    }
    let frames = 0;
    for (let j = i; j < luma.length && (j <= e || y(j) > 0.1); j++) if (y(j) > 0.1) frames++; else break;
    const fall = [];
    for (let j = h; j <= Math.min(luma.length - 1, e + 1); j++) fall.push(1 - y(j));
    out.push({ start: i, frames, hold: h - i + 1, fadeMs, shape: fall.length >= 4 ? curveShape(fall) : 'cut', peak: Math.round(peak), base: Math.round(base) });
    i = Math.max(i, e);
  }
  return out;
}

// Most flashes inside any 1 s window.
export function maxFlashRate(starts, fps) {
  let best = 0;
  for (let a = 0; a < starts.length; a++) {
    let n = 0;
    for (let b = a; b < starts.length && starts[b] - starts[a] < fps; b++) n++;
    best = Math.max(best, n);
  }
  return best;
}

// ys: a normalised curve going 0 -> 1 at equal steps. Which model fits best:
// linear (y = t/T), ease-in (y = (t/T)^2) or exponential (y = 1 - e^(-t/tau)).
export function curveShape(ys) {
  const n = ys.length;
  if (n < 3) return 'cut';
  const t = ys.map((_, i) => i);
  const cross = (lvl) => { for (let i = 1; i < n; i++) if (ys[i] >= lvl) { const f = (lvl - ys[i - 1]) / ((ys[i] - ys[i - 1]) || 1); return i - 1 + f; } return n - 1; };
  const t63 = cross(0.632), t90 = cross(0.9);
  const sse = (f) => ys.reduce((s, y, i) => s + (y - f(t[i])) ** 2, 0);
  const T1 = t90 / 0.9, T2 = t90 / Math.sqrt(0.9);
  const models = {
    linear: sse((x) => Math.min(1, x / T1)),
    'ease-in': sse((x) => Math.min(1, (x / T2) ** 2)),
    exponential: sse((x) => 1 - Math.exp(-x / (t63 || 1e-9))),
  };
  return Object.entries(models).sort((a, b) => a[1] - b[1])[0][0];
}

// Rise or decay in a series between frame `from` (the last frame before the change)
// and `to` (the frame whose value is the new level). Times in ms, interpolated.
export function stepTimes(series, from, to, dt) {
  const v0 = series[from], v1 = series[to];
  const span = v1 - v0;
  if (!Number.isFinite(span) || Math.abs(span) < 4) return null; // under 4 of 255: noise
  const y = (j) => (series[j] - v0) / span;
  const cross = (lvl) => {
    for (let j = from + 1; j <= to; j++) if (y(j) >= lvl) { const a = y(j - 1), b = y(j); return (j - 1 - from + (lvl - a) / ((b - a) || 1)) * dt; }
    return null;
  };
  const ys = [];
  for (let j = from; j <= to; j++) { ys.push(Math.max(0, Math.min(1.2, y(j)))); if (y(j) >= 0.99) break; }
  const t10 = cross(0.1), t90 = cross(0.9);
  const cut = t10 != null && t90 != null && t90 - t10 <= dt; // a jump within one frame
  return { from: Math.round(v0), to: Math.round(v1), t63: cross(0.632), t90, shape: cut ? 'cut' : curveShape(ys), ...(cut ? { delay: Math.round(t10) } : {}) };
}

// Frames where a region changed; the gaps between them as an update period.
export function updatePeriod(diffs, dt, { still = 0.02 } = {}) {
  const at = [];
  for (let i = 1; i < diffs.length; i++) if (diffs[i] > still) at.push(i);
  if (at.length < 4) return null;
  // Gaps of one frame are animation (or a fade), not a periodic update: leave them out and
  // take the most common remaining gap.
  const gaps = at.slice(1).map((v, i) => v - at[i]).filter((x) => x >= 2);
  if (gaps.length < 3) return null;
  const count = new Map();
  for (const x of gaps) count.set(x, (count.get(x) || 0) + 1);
  const [mode, n] = [...count].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  if (n < 3 || n < 0.5 * gaps.length) return null; // irregular: an easing tail, not a clock
  const near = gaps.filter((x) => Math.abs(x - mode) <= 1);
  return { ms: mode * dt, minMs: Math.min(...near) * dt, maxMs: Math.max(...near) * dt, updates: gaps.length + 1 };
}

// ---------- phase correlation ----------

function fft1(re, im, inv) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (inv ? 2 : -2) * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
  if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

function fft2(re, im, W, H, inv) {
  const rr = new Float64Array(W), ri = new Float64Array(W);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) { rr[x] = re[y * W + x]; ri[x] = im[y * W + x]; }
    fft1(rr, ri, inv);
    for (let x = 0; x < W; x++) { re[y * W + x] = rr[x]; im[y * W + x] = ri[x]; }
  }
  const cr = new Float64Array(H), ci = new Float64Array(H);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) { cr[y] = re[y * W + x]; ci[y] = im[y * W + x]; }
    fft1(cr, ci, inv);
    for (let y = 0; y < H; y++) { re[y * W + x] = cr[y]; im[y * W + x] = ci[y]; }
  }
}

// Window a W x H patch (powers of two) and return its spectrum.
export function spectrum(patch, W, H) {
  let mean = 0;
  for (const v of patch) mean += v;
  mean /= patch.length;
  const re = new Float64Array(W * H), im = new Float64Array(W * H);
  let varSum = 0;
  for (let y = 0; y < H; y++) {
    const wy = 0.5 - 0.5 * Math.cos(2 * Math.PI * y / (H - 1));
    for (let x = 0; x < W; x++) {
      const d = patch[y * W + x] - mean;
      varSum += d * d;
      re[y * W + x] = d * wy * (0.5 - 0.5 * Math.cos(2 * Math.PI * x / (W - 1)));
    }
  }
  fft2(re, im, W, H, false);
  return { re, im, std: Math.sqrt(varSum / patch.length) };
}

// Shift (dx, dy) of the content of b relative to a, with sub-pixel peak interpolation.
// conf is the correlation peak (near 1 for a clean shift, near 0 for no match).
export function phaseShift(A, B, W, H) {
  const re = new Float64Array(W * H), im = new Float64Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = B.re[i] * A.re[i] + B.im[i] * A.im[i];
    const m = B.im[i] * A.re[i] - B.re[i] * A.im[i];
    const mag = Math.hypot(r, m) || 1;
    re[i] = r / mag; im[i] = m / mag;
  }
  fft2(re, im, W, H, true);
  let best = -Infinity, bx = 0, by = 0;
  for (let i = 0; i < W * H; i++) if (re[i] > best) { best = re[i]; bx = i % W; by = (i / W) | 0; }
  const at = (x, y) => re[((y + H) % H) * W + ((x + W) % W)];
  const sub = (l, c, r) => { const d = l - 2 * c + r; return d < 0 ? 0.5 * (l - r) / d : 0; };
  let dx = bx + sub(at(bx - 1, by), best, at(bx + 1, by));
  let dy = by + sub(at(bx, by - 1), best, at(bx, by + 1));
  if (dx > W / 2) dx -= W;
  if (dy > H / 2) dy -= H;
  return { dx, dy, conf: best };
}

// ---------- the run ----------

// --actions to a time line of input events (ms from the start of recording).
export function timeline(actions) {
  const ev = [];
  let t = 0;
  for (const a of actions) {
    if (a.op === 'wait') { t += a.ms; continue; }
    if (a.op === 'key') {
      ev.push({ t, kind: 'down', a, label: `key ${a.key}` });
      ev.push({ t: t + a.hold, kind: 'up', a, label: `key ${a.key} up` });
      t += a.hold;
      continue;
    }
    ev.push({ t, kind: a.op === 'click' ? 'press' : 'other', a, label: a.op + (a.at ? ' ' + a.at.join(',') : '') });
    if (a.op === 'drag') t += a.steps * 16;
  }
  return ev.sort((x, y) => x.t - y.t);
}

async function sendEvent(page, e) {
  if (e.kind === 'down' || e.kind === 'up') {
    const k = keyInfo(e.a.key);
    if (e.kind === 'down') await page.send('Input.dispatchKeyEvent', { type: k.text ? 'keyDown' : 'rawKeyDown', ...k });
    else await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k.key, code: k.code, windowsVirtualKeyCode: k.windowsVirtualKeyCode });
  } else await runActions(page, [e.a]);
}

export function parseBox(s, i) {
  const m = String(s).match(/^(?:([\w-]+)=)?(\d+),(\d+),(\d+),(\d+)$/);
  if (!m) throw new Error(`--box takes [name=]x,y,w,h in CSS px (got "${s}")`);
  return { name: m[1] || `box${i + 1}`, x: +m[2], y: +m[3], w: +m[4], h: +m[5] };
}

const HIDDEN_HELPER = `(() => { window.__twFeel = { hidden(scene, camera, p) {
  if (!scene || !camera || !p) return null;
  const V = camera.position.constructor, skip = new Set();
  let target;
  if (p.isObject3D) { p.updateWorldMatrix(true, true); target = p.getWorldPosition(new V()); p.traverse((o) => skip.add(o)); }
  else if (Array.isArray(p)) target = new V(p[0], p[1], p[2]);
  else if (typeof p.x === 'number') target = new V(p.x, p.y, p.z);
  else return null;
  camera.updateWorldMatrix(true, false);
  const o = camera.getWorldPosition(new V());
  const d = target.clone().sub(o), dist = d.length();
  if (dist < 1e-6) return { hit: false, dist };
  const tEnd = Math.max(0.5, 1 - 0.1 / dist);
  const inside = (b, q) => q.x >= b.min.x && q.x <= b.max.x && q.y >= b.min.y && q.y <= b.max.y && q.z >= b.min.z && q.z <= b.max.z;
  let hit = false;
  scene.updateMatrixWorld();
  scene.traverseVisible((m) => {
    if (hit || !m.isMesh || m.isInstancedMesh || skip.has(m) || !m.geometry) return;
    const g = m.geometry;
    if (!g.boundingBox) g.computeBoundingBox();
    if (!g.boundingBox) return;
    const b = g.boundingBox.clone().applyMatrix4(m.matrixWorld);
    if (inside(b, o) && inside(b, target)) return; // a room or a sky around both
    let t0 = -Infinity, t1 = Infinity;
    for (const k of ['x', 'y', 'z']) {
      const s = o[k], v = d[k], lo = b.min[k], hi = b.max[k];
      if (Math.abs(v) < 1e-12) { if (s < lo || s > hi) { t0 = Infinity; break; } continue; }
      let a = (lo - s) / v, c = (hi - s) / v;
      if (a > c) { const x = a; a = c; c = x; }
      if (a > t0) t0 = a;
      if (c < t1) t1 = c;
    }
    if (t0 <= t1 && t1 >= 0 && t0 < tEnd) hit = true;
  });
  return { hit, dist };
} }; return true; })()`;

function sampleJs({ player, probe }) {
  return `(() => {
    const t = (window.__tw && window.__tw.target) ? window.__tw.target() : {};
    const c = t.camera, o = {};
    if (c && !${'__PIXELS__'}) {
      c.updateWorldMatrix(true, false);
      const e = c.matrixWorld.elements;
      const q = c.getWorldQuaternion(new c.quaternion.constructor());
      o.cam = { p: [e[12], e[13], e[14]], q: [q.x, q.y, q.z, q.w] };
      if (typeof c.fov === 'number') o.cam.fov = c.fov;
    }
    ${player ? `try { const h = window.__twFeel.hidden(t.scene, c, ${evalWithTarget(player)}); if (h) { o.hidden = h.hit; o.depth = h.dist; } } catch (err) { o.hiddenError = String(err && err.message || err); }` : ''}
    ${probe ? `{ const el = document.querySelector(${JSON.stringify(probe)}); o.probe = el ? String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) : null; }` : ''}
    return o;
  })()`;
}

function regionStats(luma, prev, W, x0, y0, x1, y1) {
  let sum = 0, diff = 0, maxDiff = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = y * W + x, v = luma[i];
    sum += v; n++;
    if (prev) { const d = Math.abs(v - prev[i]); diff += d; if (d > maxDiff) maxDiff = d; }
  }
  return { mean: n ? sum / n : 0, diff: prev && n ? diff / n : NaN, maxDiff };
}

// Share of the frame within +-6 of its most common brightness.
function uniformShare(luma) {
  const h = new Uint32Array(256);
  for (const v of luma) h[v]++;
  let best = 0, at = 0;
  for (let i = 0; i < 256; i++) if (h[i] > best) { best = h[i]; at = i; }
  let n = 0;
  for (let i = Math.max(0, at - 6); i <= Math.min(255, at + 6); i++) n += h[i];
  return n / luma.length;
}

export async function runFeel(target, opts) {
  const fps = Number(opts.fps || 60), dt = 1000 / fps;
  const seconds = Number(opts.seconds || 5);
  const frames = Math.max(2, Math.round(seconds * fps));
  const actions = parseActions(opts.actions || '');
  const events = timeline(actions);
  const boxesCss = (opts.boxes || []).map(parseBox);
  const ctx = await openPage(target, { ...(opts.page || {}), clock: true });
  const r = { url: ctx.url, fps, seconds: frames / fps, frames };
  try {
    await ctx.settle({ wait: 0 });
    const scale = Math.min(1, 480 / ctx.width);
    const W = Math.max(1, Math.round(ctx.width * scale)), H = Math.max(1, Math.round(ctx.height * scale));
    const toCap = (b) => {
      const x0 = Math.max(0, Math.min(W - 1, Math.floor(b.x * scale))), y0 = Math.max(0, Math.min(H - 1, Math.floor(b.y * scale)));
      return { ...b, x0, y0, x1: Math.max(x0 + 1, Math.min(W, Math.ceil((b.x + b.w) * scale))), y1: Math.max(y0 + 1, Math.min(H, Math.ceil((b.y + b.h) * scale))) };
    };
    const boxes = boxesCss.map(toCap);
    const hasCamera = !opts.pixels && await ctx.page.eval('!!(window.__tw && window.__tw.target && window.__tw.target().camera)');
    r.mode = hasCamera ? 'camera' : 'pixels';
    if (opts.player) {
      if (!hasCamera) throw new Error('--player needs a three.js camera (not found, or --pixels was given)');
      await ctx.page.eval(HIDDEN_HELPER);
    }
    // pixel shake band: --band x,y,w,h or the upper middle of the view
    let band = null, bandW = 0, bandH = 0;
    if (!hasCamera) {
      const b = opts.band ? parseBox(opts.band, 0) : { name: 'band', x: ctx.width * 0.25, y: ctx.height * 0.1, w: ctx.width * 0.5, h: ctx.height * 0.4 };
      band = toCap(b);
      const pow2 = (n) => 2 ** Math.floor(Math.log2(Math.max(2, n)));
      bandW = Math.min(256, pow2(band.x1 - band.x0)); bandH = Math.min(256, pow2(band.y1 - band.y0));
      band.x0 += ((band.x1 - band.x0 - bandW) >> 1); band.y0 += ((band.y1 - band.y0 - bandH) >> 1);
    }
    const sample = sampleJs({ player: opts.player, probe: opts.probe }).replace('__PIXELS__', hasCamera ? 'false' : 'true');
    const rec = [];
    const eventFrames = [];
    let prev = null, prevSpec = null, ev = 0;
    for (let k = 0; k < frames; k++) {
      while (ev < events.length && events[ev].t <= k * dt) { await sendEvent(ctx.page, events[ev]); eventFrames.push({ ...events[ev], frame: k }); ev++; }
      const s = await ctx.page.eval(`(() => { window.__tw.advance(${dt}); return ${sample}; })()`);
      const { data } = await ctx.page.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: ctx.width, height: ctx.height, scale }, captureBeyondViewport: false });
      const img = decodePng(Buffer.from(data, 'base64'));
      const luma = new Uint8Array(img.width * img.height);
      for (let i = 0, p = 0; i < luma.length; i++, p += 4) luma[i] = (img.data[p] * 54 + img.data[p + 1] * 183 + img.data[p + 2] * 19) >> 8;
      const whole = regionStats(luma, prev && prev.length === luma.length ? prev : null, img.width, 0, 0, img.width, img.height);
      const f = { luma: whole.mean, diff: whole.diff, boxes: boxes.map((b) => regionStats(luma, prev, img.width, b.x0, b.y0, b.x1, b.y1)), ...s };
      if (hasCamera && !opts.player) f.uniform = uniformShare(luma);
      if (band) {
        const patch = new Float64Array(bandW * bandH);
        for (let y = 0; y < bandH; y++) for (let x = 0; x < bandW; x++) patch[y * bandW + x] = luma[(band.y0 + y) * img.width + band.x0 + x];
        const spec = spectrum(patch, bandW, bandH);
        if (prevSpec && spec.std > 2 && prevSpec.std > 2) {
          const ps = phaseShift(prevSpec, spec, bandW, bandH);
          f.shift = ps.conf > 0.05 ? [ps.dx / scale, ps.dy / scale] : [0, 0];
        } else f.shift = [0, 0];
        prevSpec = spec;
      }
      rec.push(f);
      prev = luma;
    }
    r.events = eventFrames.map((e) => ({ t: e.t, frame: e.frame, label: e.label }));
    if (ev < events.length) r.notRun = events.slice(ev).map((e) => e.label);
    Object.assign(r, analyse(rec, eventFrames, { dt, fps, boxes: boxesCss, hasCamera, opts, height: ctx.height }));
    const logs = digestLogs(ctx.logs);
    r.exceptions = logs.exceptions;
    r.errors = logs.errors;
    if (opts.out) {
      const out = resolve(String(opts.out));
      mkdirSync(out, { recursive: true });
      r.file = join(out, 'feel.json');
      writeFileSync(r.file, JSON.stringify({ ...r, raw: rec.map((f) => ({ ...f, luma: Math.round(f.luma * 10) / 10, diff: Number.isFinite(f.diff) ? Math.round(f.diff * 100) / 100 : null, boxes: f.boxes.map((b) => ({ mean: Math.round(b.mean * 10) / 10, diff: Number.isFinite(b.diff) ? Math.round(b.diff * 100) / 100 : null })) })) }, null, 1));
    }
  } finally {
    await ctx.close().catch(() => {});
  }
  return r;
}

const r2 = (v) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 100) / 100);
const ms = (frames, dt) => Math.round(frames * dt);

export function analyse(rec, eventFrames, { dt, fps, boxes, hasCamera, opts = {}, height = 540 }) {
  const out = { findings: [], fail: [] };
  const respondMs = Number(opts.respondMs || 1000);
  const diffs = rec.map((f) => f.diff);

  // input to response
  const regions = boxes.length ? boxes.map((b, i) => ({ name: b.name, d: rec.map((f) => f.boxes[i].diff) })) : [{ name: 'frame', d: diffs }];
  out.responses = [];
  for (const e of eventFrames.filter((x) => x.kind === 'down' || x.kind === 'press')) {
    const k = e.frame;
    const row = { label: e.label, at: e.t, frame: k, regions: {} };
    for (const g of regions) {
      const base = median(g.d.slice(Math.max(1, k - 10), k));
      const thr = Math.max(3 * (Number.isFinite(base) ? base : 0), 0.3);
      let hit = null;
      for (let j = k; j < rec.length && (j - k + 1) * dt <= respondMs; j++) if (g.d[j] > thr) { hit = j; break; }
      row.regions[g.name] = hit == null ? null : { frames: hit - k + 1, ms: ms(hit - k + 1, dt) };
    }
    if (hasCamera && k >= 2 && rec[k - 1].cam && rec[k - 2].cam) {
      const p1 = rec[k - 1].cam.p, p0 = rec[k - 2].cam.p, q1 = rec[k - 1].cam.q, q0 = rec[k - 2].cam.q;
      const res = {};
      for (const lim of [0.05, 0.5]) {
        let hit = null;
        for (let j = k; j < rec.length && (j - k + 1) * dt <= respondMs; j++) {
          const c = rec[j].cam;
          if (!c) break;
          const n = j - k + 2;
          const dp = Math.hypot(...[0, 1, 2].map((i) => c.p[i] - (p1[i] + (n - 1) * (p1[i] - p0[i]))));
          const qe = [0, 1, 2, 3].map((i) => q1[i] + (n - 1) * (q1[i] - q0[i]));
          const ql = Math.hypot(...qe) || 1;
          const dq = 2 * Math.acos(Math.min(1, Math.abs(c.q.reduce((s, v, i) => s + v * qe[i] / ql, 0)))) * 180 / Math.PI;
          // rotation counts as 1 unit per 10 degrees of departure
          if (Math.max(dp, dq / 10) > lim) { hit = j; break; }
        }
        res[lim] = hit == null ? null : { frames: hit - k + 1, ms: ms(hit - k + 1, dt) };
      }
      row.camera = res;
    }
    const any = Object.values(row.regions).some(Boolean) || (row.camera && (row.camera[0.05] || row.camera[0.5]));
    if (!any) out.fail.push(`nothing responded to ${e.label} at ${e.t} ms within ${respondMs} ms`);
    out.responses.push(row);
  }

  // freezes (hit-stop)
  out.freezes = freezeRuns(diffs).map((f) => ({ startMs: ms(f.start, dt), frames: f.frames, ms: ms(f.frames, dt) }));

  // flashes
  const fl = findFlashes(rec.map((f) => f.luma), dt);
  out.flashes = fl.map((f) => ({ startMs: ms(f.start, dt), frames: f.frames, hold: f.hold, fadeMs: f.fadeMs == null ? null : Math.round(f.fadeMs), shape: f.shape, peak: f.peak, base: f.base }));
  out.flashRate = maxFlashRate(fl.map((f) => f.start), fps);
  const flashMax = Number(opts.flashMax ?? 3);
  if (out.flashRate > flashMax) out.fail.push(`${out.flashRate} flashes inside 1 s (limit ${flashMax}/s)`);

  // shake
  if (hasCamera && rec.every((f) => f.cam)) {
    const cams = rec.map((f) => f.cam);
    const res = cameraResiduals(cams, Number(opts.window || 9));
    const cut = 20;
    out.cuts = res.pos.map((v, i) => (v >= cut ? i : -1)).filter((i) => i >= 0).map((i) => ms(i, dt));
    const { threshold, bursts } = shakeBursts(res.pos, { floor: Number(opts.shakeFloor || 0.01), cut });
    const fovs = cams.map((c) => c.fov).filter((v) => typeof v === 'number');
    let depth = opts.subjectDepth ? Number(opts.subjectDepth) : null, depthFrom = depth ? '--subject-depth' : null;
    if (!depth) { const ds = rec.map((f) => f.depth).filter((v) => Number.isFinite(v)); if (ds.length) { depth = median(ds); depthFrom = 'median camera-player distance'; } }
    out.shake = bursts.map((b) => {
      const fov = typeof cams[b.peakAt].fov === 'number' ? cams[b.peakAt].fov : 50;
      const d = depth || 10;
      const px = b.peak / (2 * d * Math.tan(fov * Math.PI / 360)) * height;
      let rot = 0;
      for (let i = b.start; i <= b.end; i++) rot = Math.max(rot, res.rot[i]);
      return { startMs: ms(b.start, dt), frames: b.frames, ms: ms(b.frames, dt), peak: r2(b.peak), px: r2(px), degrees: r2(rot) };
    });
    out.shakeUnits = 'units';
    out.shakeThreshold = r2(threshold);
    out.subjectDepth = r2(depth || 10);
    out.subjectDepthFrom = depthFrom || 'assumed 10 units (give --subject-depth)';
    if (fovs.length) out.fov = { min: r2(Math.min(...fovs)), max: r2(Math.max(...fovs)) };
  } else if (!hasCamera) {
    const sx = [], sy = [];
    let px = 0, py = 0;
    for (const f of rec) { px += f.shift ? f.shift[0] : 0; py += f.shift ? f.shift[1] : 0; sx.push(px); sy.push(py); }
    // Two passes: take out the steady scroll (median velocity over 15 frames), then what is
    // left of slow drift and steps (a freeze, a flash) with a centred 15-frame median of the
    // position. Medians keep steps sharp, so neither leaks into the frames around it.
    const detrend = (pos) => {
      const vel = pos.map((v, i) => (i ? v - pos[i - 1] : 0));
      const mv = movingMedian(vel, 15);
      let acc = 0;
      const r1 = pos.map((v, i) => { acc += i ? mv[i] : 0; return v - pos[0] - acc; });
      const m = movingMedian(r1, 15);
      return r1.map((v, i) => (i < 7 || i >= r1.length - 7 ? 0 : v - m[i]));
    };
    const rx = detrend(sx), ry = detrend(sy);
    const mag = rx.map((v, i) => Math.hypot(v, ry[i]));
    const { threshold, bursts } = shakeBursts(mag, { floor: Number(opts.shakeFloor || 1) });
    out.shake = bursts.map((b) => {
      let ax = 0, ay = 0;
      for (let i = b.start; i <= b.end; i++) { ax = Math.max(ax, Math.abs(rx[i])); ay = Math.max(ay, Math.abs(ry[i])); }
      return { startMs: ms(b.start, dt), frames: b.frames, ms: ms(b.frames, dt), peak: r2(b.peak), px: r2(b.peak), x: r2(ax), y: r2(ay) };
    });
    out.shakeUnits = 'px';
    out.shakeThreshold = r2(threshold);
  }

  // boxes: rise and decay around each held key, update period
  out.boxes = boxes.map((b, i) => {
    const series = rec.map((f) => f.boxes[i].mean);
    const steps = [];
    const downs = eventFrames.filter((e) => e.kind === 'down');
    for (const d of downs) {
      const up = eventFrames.find((e) => e.kind === 'up' && e.a === d.a);
      if (!up) continue;
      const from = Math.max(0, d.frame - 1), top = Math.max(from + 1, up.frame - 1);
      const nextDown = downs.find((x) => x.frame > up.frame);
      const end = Math.min(rec.length - 1, (nextDown ? nextDown.frame : rec.length) - 1);
      const rise = stepTimes(series, from, top, dt);
      const fall = end > up.frame ? stepTimes(series, Math.max(0, up.frame - 1), end, dt) : null;
      if (rise || fall) steps.push({ key: d.label, rise: rise && { ...rise, t63: r2(rise.t63), t90: r2(rise.t90) }, decay: fall && { ...fall, t63: r2(fall.t63), t90: r2(fall.t90) } });
    }
    const period = updatePeriod(rec.map((f) => f.boxes[i].diff), dt);
    return { name: b.name, box: [b.x, b.y, b.w, b.h], steps, period: period && { ms: r2(period.ms), minMs: r2(period.minMs), maxMs: r2(period.maxMs), updates: period.updates } };
  });
  const wp = updatePeriod(diffs, dt);
  out.period = wp && { ms: r2(wp.ms), minMs: r2(wp.minMs), maxMs: r2(wp.maxMs), updates: wp.updates };

  // camera hides the player
  if (rec.some((f) => f.hidden !== undefined || f.hiddenError)) {
    const err = rec.find((f) => f.hiddenError);
    if (err) out.fail.push('--player failed: ' + err.hiddenError);
    const flags = rec.map((f) => f.hidden === true);
    const runs = groupRuns(flags);
    const longest = runs.reduce((m, g) => Math.max(m, g.end - g.start + 1), 0);
    const share = flags.filter(Boolean).length / flags.length;
    out.hidden = { share: Math.round(share * 1000) / 1000, frames: flags.filter(Boolean).length, longestMs: ms(longest, dt), runs: runs.map((g) => ({ startMs: ms(g.start, dt), ms: ms(g.end - g.start + 1, dt) })) };
    const maxShare = Number(opts.hideMax ?? 0.02), maxRun = Number(opts.hideRun ?? 1) * 1000;
    if (share > maxShare) out.fail.push(`camera hides the player ${Math.round(share * 1000) / 10}% of frames (limit ${maxShare * 100}%)`);
    if (longest * dt > maxRun + dt / 2) out.fail.push(`camera hides the player for ${ms(longest, dt)} ms in one run (limit ${maxRun} ms)`);
  } else if (hasCamera) {
    // no --player: frames mostly one flat colour and still for over 0.5 s (advisory)
    const flags = rec.map((f, i) => f.uniform >= 0.6 && i > 0 && f.diff < 0.5);
    out.blocked = groupRuns(flags).filter((g) => (g.end - g.start + 1) * dt > 500).map((g) => ({ startMs: ms(g.start, dt), ms: ms(g.end - g.start + 1, dt) }));
  }

  // probe: class spans
  if (rec.some((f) => f.probe !== undefined)) {
    const spans = [];
    const open = new Map();
    rec.forEach((f, i) => {
      const cls = new Set(String(f.probe || '').split(/\s+/).filter(Boolean));
      for (const c of cls) if (!open.has(c)) open.set(c, i);
      for (const [c, s] of open) if (!cls.has(c)) { spans.push({ cls: c, startMs: ms(s, dt), frames: i - s, ms: ms(i - s, dt) }); open.delete(c); }
    });
    for (const [c, s] of open) spans.push({ cls: c, startMs: ms(s, dt), frames: rec.length - s, ms: ms(rec.length - s, dt), open: true });
    out.probe = spans;
  }

  out.ok = out.fail.length === 0;
  return out;
}

export function formatFeel(r) {
  const L = [];
  L.push(`feel: ${r.url} · ${r.mode} mode · ${r.frames} frames at ${r.fps} fps (${r.seconds} s, virtual clock)`);
  for (const x of r.responses) {
    const parts = Object.entries(x.regions).map(([k, v]) => `${k} ${v ? `${v.frames} f / ${v.ms} ms` : 'no change'}`);
    if (x.camera) parts.push(`camera 0.05: ${x.camera[0.05] ? `${x.camera[0.05].frames} f / ${x.camera[0.05].ms} ms` : 'none'}, 0.5: ${x.camera[0.5] ? `${x.camera[0.5].frames} f / ${x.camera[0.5].ms} ms` : 'none'}`);
    L.push(`response ${x.label} @${x.at} ms: ${parts.join(' · ')}`);
  }
  if (r.responses.length > 1) {
    const all = r.responses.map((x) => Object.values(x.regions).find(Boolean)).filter(Boolean).map((v) => v.ms).sort((a, b) => a - b);
    if (all.length) L.push(`response median ${median(all)} ms (range ${all[0]}-${all[all.length - 1]} ms over ${all.length} inputs)`);
  }
  L.push(r.freezes.length ? `freezes: ${r.freezes.map((f) => `${f.frames} f (${f.ms} ms) @${f.startMs} ms`).join(' · ')}` : 'freezes: none');
  L.push(r.flashes.length ? `flashes: ${r.flashes.map((f) => `@${f.startMs} ms ${f.frames} f, hold ${f.hold} f, fade ${f.fadeMs ?? '?'} ms ${f.shape}, luma ${f.base}->${f.peak}`).join(' · ')} · max ${r.flashRate} in 1 s` : 'flashes: none');
  if (r.shake) L.push(r.shake.length ? `shake (${r.shakeUnits}, threshold ${r.shakeThreshold}): ${r.shake.map((s) => `@${s.startMs} ms ${s.frames} f (${s.ms} ms) peak ${s.peak}${r.shakeUnits === 'units' ? ` = ${s.px} px at depth ${r.subjectDepth}, ${s.degrees} deg` : ` (x ${s.x}, y ${s.y})`}`).join(' · ')}` : 'shake: none');
  if (r.cuts && r.cuts.length) L.push(`camera cuts (over 20 units): ${r.cuts.slice(0, 10).join(', ')} ms`);
  if (r.fov) L.push(`fov: ${r.fov.min}-${r.fov.max}`);
  for (const b of r.boxes) {
    const st = (v) => (!v ? ' none' : v.shape === 'cut' ? ` cut after ${v.delay} ms (${v.from}->${v.to})` : ` 63% ${v.t63 ?? '?'} ms, 90% ${v.t90 ?? '?'} ms ${v.shape} (${v.from}->${v.to})`);
    const s = b.steps.map((x) => `${x.key}: rise${st(x.rise)}; decay${st(x.decay)}`);
    L.push(`box ${b.name} ${b.box.join(',')}: ${s.join(' · ') || 'no held keys'}${b.period ? ` · updates every ${b.period.ms} ms (${b.period.minMs}-${b.period.maxMs})` : ''}`);
  }
  if (r.period && !r.boxes.length) L.push(`frame updates every ${r.period.ms} ms (${r.period.minMs}-${r.period.maxMs}, ${r.period.updates} updates)`);
  if (r.hidden) L.push(`camera hides player: ${Math.round(r.hidden.share * 1000) / 10}% of frames, longest ${r.hidden.longestMs} ms${r.hidden.runs.length ? ' (' + r.hidden.runs.slice(0, 5).map((x) => `@${x.startMs} ms ${x.ms} ms`).join(', ') + ')' : ''}`);
  if (r.blocked && r.blocked.length) L.push(`check: view mostly one flat, still colour for ${r.blocked.map((x) => `${x.ms} ms @${x.startMs}`).join(', ')} (camera in a wall? give --player to measure)`);
  if (r.probe) L.push(`probe: ${r.probe.length ? r.probe.slice(0, 12).map((p) => `.${p.cls} ${p.frames} f @${p.startMs} ms${p.open ? ' (still on)' : ''}`).join(' · ') : 'no classes'}`);
  if (r.notRun && r.notRun.length) L.push(`not sent (after the run ended): ${r.notRun.join(', ')}`);
  if (r.exceptions.length || r.errors.length) L.push(`page problems: ${[...r.exceptions, ...r.errors].slice(0, 3).map((s) => s.split('\n')[0]).join(' | ')}`);
  if (r.file) L.push(`wrote ${r.file}`);
  L.push(r.ok ? 'result: OK' : `result: FAIL ${r.fail.join('; ')}`);
  return L.join('\n');
}

// tw feel <page> [--actions "..."] [--seconds 5] [--fps 60] [--box name=x,y,w,h ...] [--player "<js>"]
//   [--pixels] [--band x,y,w,h] [--probe "<css>"] [--subject-depth D] [--out dir] [--json]
export async function cmdFeel(a, print, pageOpts) {
  const target = a._[1];
  if (!target) throw new Error('give a page: a .html file, a folder with index.html, or a URL');
  const boxes = a.box === undefined ? [] : [].concat(a.box).map(String);
  const r = await runFeel(target, {
    actions: a.actions, seconds: a.seconds, fps: a.fps, boxes, player: a.player, pixels: !!a.pixels, band: a.band, probe: a.probe,
    subjectDepth: a.subjectDepth, out: a.out, window: a.window, shakeFloor: a.shakeFloor, respondMs: a.respondMs,
    flashMax: a.flashMax, hideMax: a.hideMax, hideRun: a.hideRun, page: pageOpts(a),
  });
  print(r, a.json, formatFeel);
  if (!r.ok) process.exitCode = 1;
  return r;
}
