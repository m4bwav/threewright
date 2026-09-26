// Test and debug hooks: window.__game. Tests (Playwright, `tw check --eval`, an
// agent in the console) drive the game through these instead of guessing from
// pixels: pause, step whole ticks, inject input, read state, compare hashes.
// Installed in dev and normal builds; `npm run build:portal` leaves them out.
//
//   const g = window.__game;
//   g.pause(true); g.input.hold('right', 60); g.step(60);
//   g.state().player.x;   g.hash();   g.events(0);

import type * as THREE from 'three';
import { STEP, type ActionFrame, type Game, type GameEvent } from '../sim/game.ts';
import type { Vec3 } from '../sim/level.ts';
import type { Action, Input } from '../input/actions.ts';

export interface InputLog { version: 1; seed: number; frames: ActionFrame[] }

// What the hooks need from main.ts.
export interface App {
  game(): Game | null;
  paused(): boolean;
  setPaused(on: boolean): void;
  tick(frame?: ActionFrame): void; // one fixed tick; samples devices when no frame is given
  render(alpha: number, dt: number, snap?: boolean): void;
  restart(seed?: number): void;
  record(log: InputLog | null): void; // start or stop appending each tick's frame to log
  frameMs(): number;
  input: Input;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
}

export function installHooks(app: App) {
  const need = () => {
    const g = app.game();
    if (!g) throw new Error('__game: the game has not started yet (await window.__tw.ready)');
    return g;
  };
  const info = () => app.renderer.info.render;
  const r = (v: number) => Math.round(v * 1000) / 1000;

  const hooks = {
    version: 1,
    get seed() { return app.game()?.seed ?? null; },
    get tick() { return app.game()?.tick ?? 0; },
    get mode() { const g = app.game(); return !g ? 'loading' : app.paused() ? 'paused' : g.mode; },

    // Compact JSON: tick, mode, player, score, level, counts, camera, draw calls, triangles.
    state() {
      const g = need(), s = g.state(), c = app.camera;
      const dir = c.getWorldDirection(c.position.clone());
      return {
        tick: s.tick,
        mode: hooks.mode,
        player: s.player,
        score: s.score,
        level: s.seed,
        counts: { enemies: 0, pickups: s.pickups.left },
        camera: { x: r(c.position.x), y: r(c.position.y), z: r(c.position.z), yaw: r(Math.atan2(-dir.x, -dir.z)), pitch: r(Math.asin(dir.y)) },
        calls: info().calls,
        triangles: info().triangles,
      };
    },

    pause(on = true) { app.setPaused(on); return app.paused(); },

    // Run n fixed ticks now, synchronously, then render once. Use it paused.
    step(n = 1) {
      need();
      for (let i = 0; i < n; i++) app.tick();
      app.render(1, n * STEP);
      return app.game()!.tick;
    },

    input: {
      set: (frame: Partial<ActionFrame>) => app.input.set(frame),
      clear: () => app.input.clear(),
      hold: (action: Action, ticks: number) => app.input.hold(action, ticks),
    },

    // record() restarts the level and logs every tick's input from tick 0;
    // replay(log) restarts with the log's seed, feeds the same frames and returns the hash.
    record(): InputLog {
      const g = need();
      const log: InputLog = { version: 1, seed: g.seed, frames: [] };
      app.restart(g.seed);
      app.record(log);
      return log;
    },
    replay(log: InputLog) {
      app.record(null);
      app.restart(log.seed);
      app.setPaused(true);
      for (const f of log.frames) app.tick(f);
      app.render(1, STEP, true);
      return need().hash();
    },

    hash() { return need().hash(); },
    events(sinceTick = 0): GameEvent[] { return need().eventsSince(sinceTick); },
    restart(seed?: number) { app.restart(seed); return need().seed; },

    // Move the player: 'spawn', a pickup index, or a point. Handy to reach a spot fast.
    goto(target: 'spawn' | number | Vec3) {
      const g = need();
      const p = target === 'spawn' ? g.level.spawn : typeof target === 'number' ? g.level.pickups[target] : target;
      if (!p) throw new Error(`__game.goto: no target ${JSON.stringify(target)}`);
      g.teleport({ x: p.x, y: p.y, z: p.z });
      app.render(1, 0, true);
      return g.state().player;
    },

    perf() {
      const i = app.renderer.info;
      return { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, programs: i.programs?.length ?? 0, frameMs: r(app.frameMs()) };
    },
  };
  window.__game = hooks;
  return hooks;
}

export type GameHooks = ReturnType<typeof installHooks>;
