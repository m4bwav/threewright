// Trace tests for the adaptive quality controller, in plain Node (no browser, no three.js).
// harvestwright: kevintngo-voidlight https://github.com/kevintngo/voidlight tier - 2026-11-28
// harvestwright: kevintngo-lumenwake https://github.com/kevintngo/lumenwake tier - 2026-11-28
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createQuality, stepQuality, QUALITY_DEFAULTS, QUALITY_LEVELS } from '../src/quality.ts';

// Run a synthetic trace: frameMs(level, now) gives each frame's time. Returns the level changes.
function run(seconds: number, frameMs: (level: number, now: number) => number, start = 4) {
  let s = createQuality(start);
  const changes: { at: number; from: number; to: number }[] = [];
  let now = 0;
  while (now < seconds) {
    const dt = frameMs(s.level, now) / 1000;
    now += dt;
    const next = stepQuality(s, dt, now);
    if (next.level !== s.level) changes.push({ at: now, from: s.level, to: next.level });
    s = next;
  }
  return { state: s, changes };
}

test('steady 25 ms steps down once within 3 s and not again inside the wait', () => {
  const { changes } = run(3.7, () => 25);
  assert.equal(changes.length, 1);
  assert.deepEqual([changes[0].from, changes[0].to], [4, 3]);
  assert.ok(changes[0].at < 3, `stepped at ${changes[0].at}`);
  const second = run(8, () => 25).changes[1];
  assert.ok(second.at - changes[0].at >= QUALITY_DEFAULTS.downWait + QUALITY_DEFAULTS.downAfter, 'the second step waits out the cool-down');
});

test('steady 12 ms climbs one level per 9 s', () => {
  const { changes } = run(40, () => 12, 0);
  assert.deepEqual(changes.map((c) => c.to), [1, 2, 3, 4]);
  for (let i = 1; i < changes.length; i++) assert.ok(Math.abs(changes[i].at - changes[i - 1].at - 9) < 0.1);
  assert.ok(Math.abs(changes[0].at - 6) < 0.1);
});

test('a level that cannot hold is barred for 90 s after the first bounce', () => {
  // Slow only at the top level: down, up, down again, then no more flapping.
  const { changes, state } = run(100, (level) => (level === 4 ? 25 : 12));
  assert.deepEqual(changes.map((c) => c.to), [3, 4, 3]);
  assert.equal(state.level, 3);
  const after = run(125, (level) => (level === 4 ? 25 : 12)).changes;
  assert.equal(after[3].to, 4, 'the bar lifts');
  assert.ok(after[3].at - after[2].at >= QUALITY_DEFAULTS.barSeconds);
});

test('frames over 100 ms change nothing, and a locked state stays put', () => {
  assert.equal(run(30, () => 150).changes.length, 0);
  let s = createQuality(4);
  s.locked = true;
  for (let now = 0; now < 10; now += 0.03) s = stepQuality(s, 0.03, now);
  assert.equal(s.level, 4);
});

test('futility guard: slow at every level returns to the start level and holds longer each time', () => {
  // 25 ms whatever the level: the cost is not something the levels control.
  const { changes, state } = run(60, () => 25);
  assert.deepEqual(changes.slice(0, 2).map((c) => c.to), [3, 2]);
  assert.equal(state.futile, 2);
  assert.equal(state.level, 4);
  assert.equal(changes.length, 6, 'two rounds of down, down, back');
  assert.ok(run(300, () => 25).changes.length <= 12, 'the hold doubles, so the rounds thin out');
});

test('the level table has one row per level and never raises cost going down', () => {
  assert.equal(QUALITY_LEVELS.length, QUALITY_DEFAULTS.levels);
  for (let i = 1; i < QUALITY_LEVELS.length; i++) {
    assert.ok(QUALITY_LEVELS[i].pixelRatioScale >= QUALITY_LEVELS[i - 1].pixelRatioScale);
    assert.ok(QUALITY_LEVELS[i].shadowMapSize >= QUALITY_LEVELS[i - 1].shadowMapSize);
  }
});
