// Histogram checks for the samplers in skills/threewright-shaders/references/sampling.md.
// The js block is read from the reference itself, so the doc and the test cannot drift.
// Each sampler is mapped through its own CDF; a correct sampler fills equal bins evenly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const md = readFileSync(join(ROOT, 'skills/threewright-shaders/references/sampling.md'), 'utf8');
const blocks = [...md.matchAll(/```js\n([\s\S]*?)```/g)].map((m) => m[1]);
const S = vm.runInNewContext(blocks[0] + '\n({ concentricDisk, cosineHemisphere, uniformCone, sphereLightCosMax, triangleBary, exponentialDistance, buildCdf, sampleCdf, makeEnvSampler })', { Math, Float64Array, Array });

const N = 200000;
function rng(seed) { // mulberry32: deterministic, so the test never flakes
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Values that should be uniform on [0, 1): each of `bins` bins within 4% of its share.
function assertUniform(values, bins, label) {
  const h = new Array(bins).fill(0);
  for (const v of values) { assert.ok(v >= 0 && v <= 1, `${label}: ${v} outside [0, 1]`); h[Math.min(bins - 1, Math.floor(v * bins))]++; }
  const want = values.length / bins;
  for (let i = 0; i < bins; i++) assert.ok(Math.abs(h[i] - want) / want < 0.04, `${label}: bin ${i} has ${h[i]}, want about ${want}`);
}
const draws = (fn, seed = 1) => { const r = rng(seed); return Array.from({ length: N }, () => fn(r(), r())); };

test('sampling.md has one js block', () => assert.equal(blocks.length, 1));

test('concentric disk is uniform by area and by angle', () => {
  const pts = draws(S.concentricDisk);
  assertUniform(pts.map(([x, y]) => x * x + y * y), 10, 'r^2');
  assertUniform(pts.map(([x, y]) => (Math.atan2(y, x) + Math.PI) / (2 * Math.PI)), 8, 'angle');
});

test('cosine hemisphere: cos^2(theta) is uniform, every direction above the surface, pdf cos/pi', () => {
  const d = draws(S.cosineHemisphere);
  assert.ok(d.every((s) => s.dir[2] >= 0 && Math.abs(Math.hypot(...s.dir) - 1) < 1e-9));
  assertUniform(d.map((s) => s.dir[2] ** 2), 10, 'cos^2');
  assert.ok(d.every((s) => Math.abs(s.pdf - s.dir[2] / Math.PI) < 1e-12));
});

test('cone: cos(theta) uniform on [cosMax, 1], pdf integrates to one', () => {
  const cosMax = S.sphereLightCosMax(1, 4);
  assert.ok(Math.abs(cosMax - Math.sqrt(15) / 4) < 1e-12);
  const d = draws((a, b) => S.uniformCone(a, b, cosMax));
  assert.ok(d.every((s) => s.dir[2] >= cosMax - 1e-12));
  assertUniform(d.map((s) => (s.dir[2] - cosMax) / (1 - cosMax)), 10, 'cos in cone');
  assert.ok(Math.abs(d[0].pdf * 2 * Math.PI * (1 - cosMax) - 1) < 1e-12);
});

test('triangle barycentrics are area-uniform', () => {
  const b = draws(S.triangleBary);
  assert.ok(b.every((w) => w.every((x) => x >= 0) && Math.abs(w[0] + w[1] + w[2] - 1) < 1e-12));
  // The first weight has density 2(1 - x), so 1 - (1 - b0)^2 is uniform; same for the others.
  for (let k = 0; k < 3; k++) assertUniform(b.map((w) => 1 - (1 - w[k]) ** 2), 10, `b${k}`);
});

test('exponential distance follows exp(-sigma t) and stays finite at u = 0', () => {
  const sigma = 0.7, r = rng(3);
  assert.ok(S.exponentialDistance(0, sigma) === 0);
  assertUniform(Array.from({ length: N }, () => 1 - Math.exp(-sigma * S.exponentialDistance(r(), sigma))), 10, 'exp cdf');
});

test('CDF pick: frequencies follow the weights, zero weights never chosen, pmf reported', () => {
  const w = [1, 0, 2, 3, 0, 4], cdf = S.buildCdf(w), r = rng(5), h = new Array(w.length).fill(0);
  for (let i = 0; i < N; i++) { const s = S.sampleCdf(cdf, r()); h[s.index]++; assert.equal(s.pmf, w[s.index] / 10); }
  assert.equal(h[1] + h[4], 0);
  for (const i of [0, 2, 3, 5]) assert.ok(Math.abs(h[i] / N - w[i] / 10) < 0.005, `index ${i}: ${h[i] / N}`);
  assert.equal(S.sampleCdf(cdf, 0).index, 0);
});

test('environment sampler picks pixels by luminance times sin(theta), solid-angle pdf consistent', () => {
  const W = 16, H = 8, r0 = rng(7), lum = Array.from({ length: W * H }, () => 0.05 + r0() * (r0() < 0.1 ? 50 : 1));
  const sample = S.makeEnvSampler(lum, W, H), r = rng(9), h = new Array(W * H).fill(0);
  let pdfOk = true;
  const weight = (i) => lum[i] * Math.sin(((Math.floor(i / W) + 0.5) / H) * Math.PI);
  let total = 0;
  for (let i = 0; i < W * H; i++) total += weight(i);
  for (let i = 0; i < N; i++) {
    const s = sample(r(), r()), idx = s.y * W + s.x;
    h[idx]++;
    const sa = (2 * Math.PI / W) * (Math.PI / H) * Math.sin(((s.y + 0.5) / H) * Math.PI);
    if (Math.abs(s.pdf * sa - weight(idx) / total) > 1e-9) pdfOk = false;
  }
  assert.ok(pdfOk, 'pdf times pixel solid angle should equal the pixel pick probability');
  // Bright pixels (at least 1% of picks each) within 8% of their expected share.
  for (let i = 0; i < W * H; i++) {
    const want = weight(i) / total;
    if (want > 0.01) assert.ok(Math.abs(h[i] / N - want) / want < 0.08, `pixel ${i}: ${h[i] / N} vs ${want}`);
  }
});

test('cosine sampling beats uniform for AO: variance per sample, same integral', () => {
  // AO behind a wall: visible where dir.x > -0.3. Uniform estimator V cos / pi / (1 / 2pi); cosine estimator V.
  const stats = (vals) => { const m = vals.reduce((a, b) => a + b, 0) / vals.length; return { m, v: vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length }; };
  const r = rng(11);
  const uni = stats(Array.from({ length: N }, () => {
    const z = r(), phi = 2 * Math.PI * r(), s = Math.sqrt(1 - z * z);
    return (s * Math.cos(phi) > -0.3 ? 1 : 0) * 2 * z;
  }));
  const cos = stats(draws((a, b) => (S.cosineHemisphere(a, b).dir[0] > -0.3 ? 1 : 0), 13));
  assert.ok(Math.abs(uni.m - cos.m) < 0.01, `means ${uni.m} vs ${cos.m}`);
  assert.ok(cos.v < 0.6 * uni.v, `variance cosine ${cos.v} vs uniform ${uni.v}`);
  console.log(`# AO variance per sample: uniform ${uni.v.toFixed(4)}, cosine ${cos.v.toFixed(4)}, ratio ${(cos.v / uni.v).toFixed(2)}`);
});
