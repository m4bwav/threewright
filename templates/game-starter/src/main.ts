// Wiring: Rapier, the simulation, the fixed-step loop, input, the view and the HUD.
// The simulation (src/sim) knows nothing about three.js or the DOM; this file is
// the only place where frames, devices and ticks meet.

import * as THREE from 'three';
import { Game, STEP, type ActionFrame, type Rapier } from './sim/game.ts';
import { parseSeed } from './sim/rng.ts';
import { FixedStep } from './loop.ts';
import { Input } from './input/actions.ts';
import { View } from './view/scene.ts';
import { Hud } from './ui/hud.ts';
import type { App, InputLog } from './debug/hooks.ts';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.getElementById('app')!.appendChild(renderer.domElement);

const view = new View(window.innerWidth / window.innerHeight);
const input = new Input();
input.attach();
const loop = new FixedStep();
const timer = new THREE.Timer();
timer.connect(document); // pauses the clock while the tab is hidden

let R: Rapier | null = null;
let game: Game | null = null;
let paused = false;
let recording: InputLog | null = null;
let frameMs = 0;
let seed = parseSeed(new URLSearchParams(location.search).get('seed'), 1);

const hud = new Hud((screen) => {
  if (screen === 'paused') paused = false;
  else if (screen === 'won' || screen === 'over') restart();
});

function restart(next = seed): void {
  if (!R) return;
  seed = next >>> 0;
  game?.dispose();
  game = new Game(R, seed);
  view.setLevel(game.level);
  loop.reset();
  paused = false;
  render(1, 0, true);
}

function tick(frame?: ActionFrame): void {
  if (!game || game.mode !== 'play') return;
  const f = frame ?? input.sample();
  recording?.frames.push(f);
  game.step(f);
}

function render(alpha: number, dt: number, snap = false): void {
  view.sync(game, alpha, dt, snap);
  renderer.render(view.scene, view.camera);
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && game) paused = !paused;
  else if (e.code === 'KeyR') restart();
});
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  view.resize(window.innerWidth / window.innerHeight);
});

let startWasDown = false;
renderer.setAnimationLoop((time) => {
  timer.update(time);
  const dt = timer.getDelta();
  frameMs += (dt * 1000 - frameMs) * 0.1;
  const start = input.startPressed();
  if (start && !startWasDown && game) paused = !paused;
  startWasDown = start;
  if (!paused) {
    const n = loop.advance(dt);
    for (let i = 0; i < n; i++) tick();
  }
  render(paused ? 1 : loop.alpha, paused ? 0 : dt);
  hud.update(game, paused);
});

const app: App = {
  game: () => game,
  paused: () => paused,
  setPaused: (on) => { paused = on; },
  tick,
  render,
  restart,
  record: (log) => { recording = log; },
  frameMs: () => frameMs,
  input,
  renderer,
  camera: view.camera,
};

// Rapier's WASM loads after the first frames are on screen; tw and tests wait on this.
const tw = (window.__tw ??= {});
tw.ready = (async () => {
  try {
    const mod = await import('@dimforge/rapier3d-compat');
    await mod.init();
    R = mod;
    restart(seed);
    if (import.meta.env.MODE !== 'portal') (await import('./debug/hooks.ts')).installHooks(app);
    await new Promise((r) => requestAnimationFrame(r));
  } catch (err) {
    hud.error(String((err as Error)?.message ?? err));
    throw err;
  }
})();

export { STEP };
