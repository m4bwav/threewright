// Simulation tests in plain Node (no browser, no three.js): determinism, movement,
// the fixed-step accumulator. Run: npm test (Node 22.18+ runs TypeScript directly).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { Game, NO_INPUT, STEP } from '../src/sim/game.ts';
import { FixedStep, MAX_STEPS } from '../src/loop.ts';

await RAPIER.init();

const run = (seed: number, ticks: number) => {
  const g = new Game(RAPIER, seed);
  for (let i = 0; i < ticks; i++) g.step(i < 60 ? { moveX: 1, moveY: 0, jump: i === 30 } : NO_INPUT);
  const h = g.hash();
  const s = g.state();
  g.dispose();
  return { h, s };
};

test('same seed and inputs give the same hash', () => {
  assert.equal(run(7, 180).h, run(7, 180).h);
});

test('different seeds build different levels', () => {
  assert.notEqual(run(1, 1).h, run(2, 1).h);
});

test('holding right moves the player along +x', () => {
  const g = new Game(RAPIER, 1);
  for (let i = 0; i < 60; i++) g.step(NO_INPUT); // land first
  const x0 = g.state().player.x;
  for (let i = 0; i < 30; i++) g.step({ moveX: 1, moveY: 0, jump: false });
  assert.ok(g.state().player.x > x0 + 0.5, `x ${x0} -> ${g.state().player.x}`);
  g.dispose();
});

test('fixed step banks time and caps catch-up', () => {
  const l = new FixedStep();
  assert.equal(l.advance(STEP * 2.5), 2);
  assert.ok(l.alpha > 0.4 && l.alpha < 0.6);
  assert.equal(l.advance(10), MAX_STEPS);
});
