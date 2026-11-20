// tw play: the pure parts (seeded monkey, decisions, stuck watch) and end-to-end runs
// on small canvas fixtures (no three, no network). Browser runs skip without Chrome
// or with TW_SKIP_BROWSER=1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome } from '../scripts/lib/cdp.mjs';
import { difficultyRead, makeRng, monkeyAction, parseDecision, progressOf, softlockWatch, stuckWatch } from '../scripts/lib/play.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TW = join(ROOT, 'scripts/tw.mjs');
const PAGES = join(ROOT, 'tests/fixtures/pages');
const skip = process.env.TW_SKIP_BROWSER ? 'TW_SKIP_BROWSER is set' : !findChrome() ? 'no Chrome or Chromium found (set TW_CHROME)' : false;

test('makeRng and monkeyAction give the same actions for the same seed', () => {
  const run = (seed) => { const r = makeRng(seed); return Array.from({ length: 50 }, () => monkeyAction(r, { width: 320, height: 180 })); };
  assert.deepEqual(run(7), run(7));
  assert.notDeepEqual(run(7), run(8));
  for (const a of run(3)) assert.doesNotThrow(() => parseDecision(a), a);
});

test('monkeyAction only presses the given keys', () => {
  const r = makeRng(1);
  const keys = new Set();
  for (let i = 0; i < 300; i++) { const m = monkeyAction(r, { keys: ['Space'] }).match(/^key (\S+)/); if (m) keys.add(m[1]); }
  assert.deepEqual([...keys], ['Space']);
});

test('parseDecision reads actions, done, fail and idle', () => {
  assert.equal(parseDecision(null).kind, 'idle');
  assert.deepEqual(parseDecision('done reached goal'), { kind: 'done', reason: 'reached goal' });
  assert.equal(parseDecision('fail').kind, 'fail');
  const d = parseDecision('key KeyW 100; click 10,20');
  assert.equal(d.kind, 'act');
  assert.equal(d.actions.length, 2);
  assert.throws(() => parseDecision('jump'), /unknown action/);
});

test('stuckWatch flags unchanged state and frame stalls', () => {
  let w = stuckWatch({ stuckMs: 1000, stallMs: 0 });
  assert.equal(w(0, 'a', 1), null);
  assert.equal(w(900, 'a', 2), null);
  assert.equal(w(950, 'b', 3), null);
  assert.match(w(1950, 'b', 4), /state unchanged for 1\.0 s/);
  w = stuckWatch({ stuckMs: 0, stallMs: 500 });
  assert.equal(w(0, 'a', 5), null);
  assert.match(w(600, 'b', 5), /no animation frame/);
});

function play(...args) {
  const out = mkdtempSync(join(tmpdir(), 'tw-play-'));
  const r = spawnSync(process.execPath, [TW, 'play', ...args, '--out', out, '--json', '--size', '320x180'], { encoding: 'utf8', timeout: 120000 });
  let json = null;
  try { json = JSON.parse(r.stdout); } catch { /* error text */ }
  const trace = existsSync(join(out, 'trace.jsonl')) ? readFileSync(join(out, 'trace.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
  const shot = existsSync(join(out, 'fail.png'));
  const result = existsSync(join(out, 'result.json')) ? JSON.parse(readFileSync(join(out, 'result.json'), 'utf8')) : null;
  rmSync(out, { recursive: true, force: true });
  return { code: r.status, json, trace, shot, result, err: r.stderr + r.stdout };
}

test('tw play: an uncaught exception is a crash with its stack and a screenshot', { skip, timeout: 150000 }, () => {
  const r = play(join(PAGES, 'play-throw'), '--monkey', '--keys', 'Space', '--seconds', '25', '--stuck', '0', '--tick', '50');
  assert.ok(r.json, r.err);
  assert.equal(r.json.status, 'crash', r.err);
  assert.match(r.json.exception, /jump buffer overflow at press 10[\s\S]*at jump/);
  assert.equal(r.code, 1);
  assert.ok(r.shot, 'fail.png written');
  assert.equal(r.result.status, 'crash');
  assert.ok(r.trace.length > 9);
});

test('tw play: state that stops changing is stuck', { skip, timeout: 150000 }, () => {
  const r = play(join(PAGES, 'play-freeze'), '--monkey', '--seconds', '20', '--stuck', '2');
  assert.ok(r.json, r.err);
  assert.equal(r.json.status, 'stuck', r.err);
  assert.match(r.json.reason, /state unchanged/);
  assert.equal(r.json.stateSource, '__game.snapshot()');
  assert.equal(r.code, 1);
  assert.ok(r.shot, 'fail.png written');
  assert.ok(r.json.elapsed < 10, `stuck found early (${r.json.elapsed} s)`);
});

test('tw play: a clean page runs to timeout with no errors', { skip, timeout: 150000 }, () => {
  const r = play(join(PAGES, 'play-clean'), '--monkey', '--seconds', '4', '--seed', '3');
  assert.ok(r.json, r.err);
  assert.equal(r.json.status, 'timeout', r.err);
  assert.equal(r.json.ok, true);
  assert.equal(r.json.exceptions.length + r.json.errors.length, 0);
  assert.equal(r.code, 0);
  assert.equal(r.shot, false);
  assert.ok(r.trace.length >= 10, `${r.trace.length} ticks`);
});

test('tw play: the same seed gives the same action column', { skip, timeout: 200000 }, () => {
  const a = play(join(PAGES, 'play-clean'), '--monkey', '--seed', '5', '--ticks', '25', '--seconds', '60');
  const b = play(join(PAGES, 'play-clean'), '--monkey', '--seed', '5', '--ticks', '25', '--seconds', '60');
  const c = play(join(PAGES, 'play-clean'), '--monkey', '--seed', '6', '--ticks', '25', '--seconds', '60');
  assert.ok(a.json && b.json && c.json, a.err + b.err + c.err);
  assert.equal(a.trace.length, 25);
  assert.deepEqual(a.trace.map((e) => e.action), b.trace.map((e) => e.action));
  assert.notDeepEqual(a.trace.map((e) => e.action), c.trace.map((e) => e.action));
  assert.match(a.json.reason, /ran 25 ticks/);
});

test('tw play: a bot module plays to done; no state hook falls back to a frame hash', { skip, timeout: 150000 }, () => {
  const r = play(join(PAGES, 'play-clean'), '--bot', join(PAGES, 'play-bot/bot.mjs'), '--seconds', '15');
  assert.ok(r.json, r.err);
  assert.equal(r.json.status, 'done', r.err);
  assert.match(r.json.reason, /reached x/);
  assert.equal(r.code, 0);
  assert.equal(r.trace[0].action, 'key Space 30');
  const f = play(join(PAGES, 'play-freeze') + '/?nohook', '--monkey', '--seconds', '20', '--stuck', '2', '--keys', 'KeyX');
  assert.ok(f.json, f.err);
  assert.equal(f.json.stateSource, 'frame hash (no state hook)');
  assert.equal(f.json.status, 'stuck', f.err);
});

test('progressOf reads score and position from common state shapes', () => {
  assert.deepEqual(progressOf({ x: 3, y: 4, score: 2 }), { score: 2, pos: [3, 4] });
  assert.deepEqual(progressOf({ player: { pos: [1, 2, 3], score: 5 } }), { score: 5, pos: [1, 2, 3] });
  assert.deepEqual(progressOf({ points: 1, position: { x: 0, z: 9 } }), { score: 1, pos: [0, 9] });
  assert.deepEqual(progressOf('text'), { score: null, pos: null });
});

test('softlockWatch counts one window while frames run and input goes in', () => {
  const w = softlockWatch({ windowMs: 1000 });
  let f = 0;
  for (let t = 0; t <= 3000; t += 100) w.step(t, { pos: [t < 500 ? t : 500], score: 0 }, f++, true, t / 100);
  assert.equal(w.windows.length, 1);
  assert.equal(w.windows[0].t, 0.5);
  const idle = softlockWatch({ windowMs: 1000 });
  for (let t = 0; t <= 3000; t += 100) idle.step(t, { pos: [0], score: 0 }, f++, false, t / 100);
  assert.equal(idle.windows.length, 0, 'no input sent: not a softlock');
});

test('difficultyRead names decorative, delay-matters and fast-fails', () => {
  const run = (delay, status, elapsed, end = 3) => ({ delay, status, elapsed, score: { start: 0, end } });
  assert.equal(difficultyRead([run(0, 'timeout', 6), run(300, 'timeout', 6)]).verdict, 'decorative');
  assert.equal(difficultyRead([run(0, 'timeout', 6), run(300, 'fail', 1.5, 0)]).verdict, 'delay-matters');
  assert.equal(difficultyRead([run(0, 'fail', 1), run(300, 'fail', 1)]).verdict, 'fast-fails');
});

test('tw play: --softlock fails a walled track and passes an open one with a first score', { skip, timeout: 200000 }, () => {
  const bot = join(PAGES, 'play-track/bot.mjs');
  const open = play(join(PAGES, 'play-track'), '--bot', bot, '--seconds', '4', '--softlock', '1');
  assert.ok(open.json, open.err);
  assert.equal(open.json.status, 'timeout', open.err);
  assert.equal(open.json.softlockWindows, 0);
  assert.ok(open.json.score.end > open.json.score.start, 'score rose');
  assert.ok(open.json.firstScore && open.json.firstScore.tick < 10, JSON.stringify(open.json.firstScore));
  assert.equal(open.code, 0);
  const wall = play(join(PAGES, 'play-track') + '/?wall', '--bot', bot, '--seconds', '4', '--softlock', '1');
  assert.ok(wall.json, wall.err);
  assert.equal(wall.json.status, 'softlock', wall.err);
  assert.ok(wall.json.softlockWindows > 0);
  assert.equal(wall.code, 1);
});

test('tw play --delays 0,300: the late run dies earlier than the quick one', { skip, timeout: 200000 }, () => {
  const r = play(join(PAGES, 'play-hazard'), '--bot', join(PAGES, 'play-hazard/bot.mjs'), '--seconds', '5', '--delays', '0,300');
  assert.ok(r.json, r.err);
  const [fast, slow] = r.json.delays;
  assert.equal(fast.delay, 0);
  assert.equal(slow.delay, 300);
  assert.equal(fast.status, 'timeout', r.err);
  assert.equal(slow.status, 'fail');
  assert.ok(slow.elapsed < fast.elapsed, `${slow.elapsed} < ${fast.elapsed}`);
  assert.equal(r.json.read.verdict, 'delay-matters');
  assert.equal(r.code, 0);
});
