// tw feel: the pure measurements on synthetic series, then end-to-end runs on fixture pages
// with known events (feel-3d camera, feel-2d pixels, feel-box curves). Browser runs skip
// without Chrome or with TW_SKIP_BROWSER=1. The three.js fixture loads three from dev/node_modules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome } from '../scripts/lib/cdp.mjs';
import { curveShape, findFlashes, freezeRuns, maxFlashRate, parseBox, phaseShift, shakeBursts, spectrum, stepTimes, timeline, updatePeriod } from '../scripts/lib/feel.mjs';
import { parseActions } from '../scripts/lib/actions.mjs';
import { lookMetrics } from '../scripts/lib/png.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TW = join(ROOT, 'scripts/tw.mjs');
const PAGES = join(ROOT, 'tests/fixtures/pages');
const skip = process.env.TW_SKIP_BROWSER ? 'TW_SKIP_BROWSER is set' : !findChrome() ? 'no Chrome or Chromium found (set TW_CHROME)' : false;
const dt = 1000 / 60;
const near = (v, want, tol, what) => assert.ok(Math.abs(v - want) <= tol, `${what}: ${v}, want ${want} +-${tol}`);

test('shakeBursts finds one decaying burst and nothing in smooth noise', () => {
  const res = Array.from({ length: 300 }, (_, i) => 0.002 + 0.001 * Math.sin(i));
  for (let n = 0; n < 15; n++) res[120 + n] = 0.75 * (1 - n / 15);
  const { bursts } = shakeBursts(res);
  assert.equal(bursts.length, 1);
  near(bursts[0].frames, 15, 2, 'frames');
  near(bursts[0].peak, 0.75, 0.01, 'peak');
  assert.equal(shakeBursts(res.map((v, i) => (i >= 120 && i < 135 ? 0.002 : v))).bursts.length, 0);
});

test('freezeRuns finds a run of identical frames inside motion only', () => {
  const d = Array.from({ length: 100 }, () => 2);
  d[0] = NaN;
  for (let i = 40; i < 46; i++) d[i] = 0;
  assert.deepEqual(freezeRuns(d), [{ start: 40, frames: 6 }]);
  const still = Array.from({ length: 100 }, (_, i) => (i % 6 === 0 ? 3 : 0)); // a static page with a ticking HUD
  assert.deepEqual(freezeRuns(still), []);
});

test('findFlashes reads hold, fade length and shape; maxFlashRate counts per second', () => {
  const luma = Array.from({ length: 80 }, () => 20);
  luma[10] = 255;
  for (let k = 1; k <= 30; k++) luma[10 + k] = 20 + 235 * Math.max(0, 1 - (k * dt) / 500);
  const [f] = findFlashes(luma, dt);
  assert.equal(f.hold, 1);
  near(f.fadeMs, 500, 34, 'fade ms');
  assert.equal(f.shape, 'linear');
  const two = Array.from({ length: 30 }, () => 20);
  two[5] = two[6] = 255;
  assert.equal(findFlashes(two, dt)[0].frames, 2);
  assert.equal(maxFlashRate([0, 12, 24, 36, 48, 60], 60), 5);
});

test('curveShape and stepTimes tell linear, ease-in and exponential apart', () => {
  const xs = Array.from({ length: 30 }, (_, i) => i);
  assert.equal(curveShape(xs.map((i) => Math.min(1, i / 20))), 'linear');
  assert.equal(curveShape(xs.map((i) => Math.min(1, (i / 20) ** 2))), 'ease-in');
  assert.equal(curveShape(xs.map((i) => 1 - Math.exp(-i / 7))), 'exponential');
  const series = [0, ...Array.from({ length: 60 }, (_, i) => 255 * (1 - Math.exp(-((i + 1) * dt) / 120)))];
  const s = stepTimes(series, 0, 60, dt);
  near(s.t63, 120, 20, 't63');
  assert.equal(s.shape, 'exponential');
  const jump = [0, 0, 0, 0, 200, 200, 200];
  assert.equal(stepTimes(jump, 0, 6, dt).shape, 'cut');
});

test('updatePeriod reads a 100 ms tick and ignores every-frame animation', () => {
  const d = Array.from({ length: 120 }, (_, i) => (i % 6 === 0 ? 5 : 0));
  near(updatePeriod(d, dt).ms, 100, 0.01, 'period');
  assert.equal(updatePeriod(Array.from({ length: 120 }, () => 1), dt), null);
});

test('phaseShift recovers a known shift of a textured patch', () => {
  const W = 64, H = 32;
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const big = Array.from({ length: 128 * 64 }, () => rnd() * 255);
  const cut = (ox, oy) => { const p = new Float64Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p[y * W + x] = big[(y + 16 - oy) * 128 + x + 32 - ox]; return p; };
  const r = phaseShift(spectrum(cut(0, 0), W, H), spectrum(cut(5, -3), W, H), W, H);
  near(r.dx, 5, 0.3, 'dx');
  near(r.dy, -3, 0.3, 'dy');
  assert.ok(r.conf > 0.3);
});

test('timeline turns --actions into timed downs, ups and presses; parseBox names boxes', () => {
  const ev = timeline(parseActions('wait 200; key KeyF 1000; wait 300; click 10,20'));
  assert.deepEqual(ev.map((e) => [e.t, e.kind]), [[200, 'down'], [1200, 'up'], [1500, 'press']]);
  assert.deepEqual(parseBox('glow=1,2,3,4', 0), { name: 'glow', x: 1, y: 2, w: 3, h: 4 });
  assert.equal(parseBox('1,2,3,4', 1).name, 'box2');
  assert.throws(() => parseBox('1,2,3', 0), /x,y,w,h/);
});

test('lookMetrics flags a flat frame on all four and a textured one on none', () => {
  const W = 64, H = 64;
  const flat = { width: W, height: H, data: new Uint8Array(W * H * 4).fill(90) };
  assert.equal(lookMetrics(flat).low.length, 4);
  let seed = 9;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const data = new Uint8Array(W * H * 4);
  for (let i = 0; i < data.length; i++) data[i] = (i % 4 === 3) ? 255 : Math.floor(rnd() * 256);
  const m = lookMetrics({ width: W, height: H, data });
  assert.deepEqual(m.low, []);
  assert.ok(m.entropy > 8 && m.edges > 0.5 && m.contrast > 150);
});

function feel(page, ...args) {
  const out = mkdtempSync(join(tmpdir(), 'tw-feel-'));
  const r = spawnSync(process.execPath, [TW, 'feel', page, ...args, '--json', '--size', '480x270'], { encoding: 'utf8', timeout: 240000 });
  rmSync(out, { recursive: true, force: true });
  let json = null;
  try { json = JSON.parse(r.stdout); } catch { /* error text */ }
  return { code: r.status, json, err: r.stderr + r.stdout.slice(0, 2000) };
}

test('tw feel (camera): one shake burst of 15 frames, FOV range, 1-frame pitch response, wall hides the player', { skip, timeout: 260000 }, () => {
  const r = feel(join(PAGES, 'feel-3d'), '--seconds', '6', '--actions', 'wait 3000; key KeyP 50', '--player', "find('player')");
  assert.ok(r.json, r.err);
  assert.equal(r.json.mode, 'camera');
  assert.equal(r.json.shake.length, 1, JSON.stringify(r.json.shake));
  near(r.json.shake[0].frames, 15, 2, 'shake frames');
  near(r.json.shake[0].peak, 0.75, 0.075, 'shake peak units');
  near(r.json.shake[0].startMs, 2000, 50, 'shake start');
  assert.deepEqual(r.json.fov, { min: 60, max: 74 });
  assert.equal(r.json.responses[0].camera['0.05'].frames, 1);
  near(r.json.hidden.longestMs, 1000, 100, 'hidden run');
  assert.equal(r.json.hidden.runs.length, 1);
  assert.equal(r.json.ok, false);
  assert.match(r.json.fail.join(' '), /hides the player/);
  assert.equal(r.code, 1);
});

test('tw feel (pixels): response 100 ms, a 6-frame freeze, a 2-frame flash, one 6 px shake, a 20-frame class', { skip, timeout: 260000 }, () => {
  const r = feel(join(PAGES, 'feel-2d'), '--seconds', '6', '--actions', 'wait 1000; key Space 50', '--box', 'player=62,182,36,36', '--probe', '#hud');
  assert.ok(r.json, r.err);
  assert.equal(r.json.mode, 'pixels');
  near(r.json.responses[0].regions.player.ms, 100, 40, 'response ms');
  assert.equal(r.json.freezes.length, 1, JSON.stringify(r.json.freezes));
  near(r.json.freezes[0].frames, 6, 1, 'freeze frames');
  assert.equal(r.json.flashes.length, 1);
  near(r.json.flashes[0].frames, 2, 1, 'flash frames');
  assert.equal(r.json.shake.length, 1, JSON.stringify(r.json.shake));
  near(r.json.shake[0].x, 6, 1, 'shake x px');
  const pulse = r.json.probe.find((p) => p.cls === 'pulse');
  near(pulse.frames, 20, 1, 'class frames');
  assert.equal(r.json.ok, true);
  assert.equal(r.code, 0);
});

test('tw feel (boxes): a 120 ms rise, a linear 500 ms flash fade, a 100 ms counter; a 5/s strobe fails', { skip, timeout: 260000 }, () => {
  const r = feel(join(PAGES, 'feel-box'), '--seconds', '2.5', '--actions', 'wait 200; key KeyF 1000; wait 300; key KeyL 30', '--box', 'glow=22,22,56,56', '--box', 'counter=200,20,80,40');
  assert.ok(r.json, r.err);
  const glow = r.json.boxes.find((b) => b.name === 'glow');
  near(glow.steps[0].rise.t63, 120, 20, 'rise t63');
  assert.equal(glow.steps[0].rise.shape, 'exponential');
  near(glow.steps[0].decay.t63, 120, 20, 'decay t63');
  assert.equal(r.json.flashes.length, 1);
  near(r.json.flashes[0].fadeMs, 500, 34, 'flash fade');
  assert.equal(r.json.flashes[0].shape, 'linear');
  near(r.json.boxes.find((b) => b.name === 'counter').period.ms, 100, 1, 'counter period');
  assert.equal(r.code, 0, r.err);
  const s = feel(join(PAGES, 'feel-box') + '/?strobe=5', '--seconds', '2');
  assert.ok(s.json, s.err);
  assert.ok(s.json.flashRate >= 4, `flash rate ${s.json.flashRate}`);
  assert.match(s.json.fail.join(' '), /flashes inside 1 s/);
  assert.equal(s.code, 1);
});

test('tw shot --metrics prints advisory look numbers; perf warns on software GL', { skip, timeout: 200000 }, () => {
  const out = mkdtempSync(join(tmpdir(), 'tw-shot-'));
  const flat = spawnSync(process.execPath, [TW, 'shot', "data:text/html,<body style='margin:0;background:#336'></body>", '--out', join(out, 'flat.png'), '--metrics', '--size', '320x180'], { encoding: 'utf8', timeout: 120000 });
  assert.equal(flat.status, 0, flat.stderr);
  assert.match(flat.stdout, /look: entropy=0 bits dominant=1 edges=0 contrast=0 \(advisory\)/);
  assert.equal((flat.stdout.match(/^low: /gm) || []).length, 4);
  const busy = spawnSync(process.execPath, [TW, 'shot', join(PAGES, 'feel-2d'), '--out', join(out, 'busy.jpg'), '--metrics', '--size', '480x270'], { encoding: 'utf8', timeout: 120000 });
  assert.equal(busy.status, 0, busy.stderr);
  assert.match(busy.stdout, /look: entropy=\d/);
  assert.doesNotMatch(busy.stdout, /low: (colour entropy|edge density|contrast)/);
  const perf = spawnSync(process.execPath, [TW, 'perf', join(PAGES, 'feel-3d'), '--seconds', '1', '--gl', 'swiftshader', '--size', '320x180'], { encoding: 'utf8', timeout: 120000 });
  assert.match(perf.stdout.split('\n')[0], /^warning: software GL .*SwiftShader/i, perf.stdout + perf.stderr);
  rmSync(out, { recursive: true, force: true });
});
