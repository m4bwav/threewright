// The level as plain data: a pure function of the seed. Physics (game.ts) and the
// three.js view (view/scene.ts) both read it, so the collider and the mesh of a
// box can never disagree, and tests can build the same level without a browser.

import { mulberry32 } from './rng.ts';

export interface Vec3 { x: number; y: number; z: number }

export type BoxKind = 'ground' | 'wall' | 'platform' | 'ramp' | 'block' | 'crate';

export interface Box {
  kind: BoxKind;
  center: Vec3;
  half: Vec3; // half extents
  tilt: number; // rotation about the x axis in radians (ramps); 0 for the rest
  dynamic: boolean; // crates are dynamic bodies the player can push
}

export interface Level {
  seed: number;
  size: number; // half width of the square arena
  spawn: Vec3;
  boxes: Box[];
  pickups: Vec3[];
}

const ARENA = 12;
const PLATFORM = { x: -6, z: -6, half: 2.5, height: 1.5 };

const box = (kind: BoxKind, cx: number, cy: number, cz: number, hx: number, hy: number, hz: number, tilt = 0, dynamic = false): Box =>
  ({ kind, center: { x: cx, y: cy, z: cz }, half: { x: hx, y: hy, z: hz }, tilt, dynamic });

export function makeLevel(seed: number): Level {
  const rand = mulberry32(seed);
  const range = (lo: number, hi: number) => lo + (hi - lo) * rand();
  const spawn = { x: 0, y: 1.2, z: 7 };
  const boxes: Box[] = [
    box('ground', 0, -0.5, 0, ARENA, 0.5, ARENA),
    // Low walls: they stop crates sliding off, and a jump still clears them, so
    // falling off the edge (and losing a life) stays possible.
    box('wall', 0, 0.5, -ARENA - 0.25, ARENA + 0.5, 0.5, 0.25),
    box('wall', 0, 0.5, ARENA + 0.25, ARENA + 0.5, 0.5, 0.25),
    box('wall', -ARENA - 0.25, 0.5, 0, 0.25, 0.5, ARENA),
    box('wall', ARENA + 0.25, 0.5, 0, 0.25, 0.5, ARENA),
    box('platform', PLATFORM.x, PLATFORM.height / 2, PLATFORM.z, PLATFORM.half, PLATFORM.height / 2, PLATFORM.half),
  ];

  // A 20 degree ramp from the ground up to the platform's south edge. The top face
  // runs from (z0, height) down to (z0 + run, 0); the box sits half its thickness
  // below that face, along the tilted up axis (0, cos, sin).
  const angle = (20 * Math.PI) / 180;
  const thick = 0.15;
  const z0 = PLATFORM.z + PLATFORM.half;
  const run = PLATFORM.height / Math.tan(angle);
  const length = PLATFORM.height / Math.sin(angle);
  boxes.push(box('ramp', PLATFORM.x, PLATFORM.height / 2 - thick * Math.cos(angle), z0 + run / 2 - thick * Math.sin(angle), 1.5, thick, length / 2, angle));

  // Keep-out rectangles (x0, z0, x1, z1) so generated things never overlap the
  // spawn point, the platform and ramp, or each other.
  const taken: number[][] = [
    [spawn.x - 2.5, spawn.z - 2.5, spawn.x + 2.5, spawn.z + 2.5],
    [PLATFORM.x - PLATFORM.half - 1, PLATFORM.z - PLATFORM.half - 1, PLATFORM.x + PLATFORM.half + 1, z0 + run + 1.5],
  ];
  const free = (x0: number, z0: number, x1: number, z1: number) => taken.every((r) => x1 < r[0] || x0 > r[2] || z1 < r[1] || z0 > r[3]);
  // Rejection sampling stays a pure function of the seed: the same draws in the same order.
  const place = (hx: number, hz: number, margin: number): { x: number; z: number } | null => {
    for (let tries = 0; tries < 50; tries++) {
      const x = range(-ARENA + hx + 1, ARENA - hx - 1);
      const z = range(-ARENA + hz + 1, ARENA - hz - 1);
      if (free(x - hx - margin, z - hz - margin, x + hx + margin, z + hz + margin)) {
        taken.push([x - hx - margin, z - hz - margin, x + hx + margin, z + hz + margin]);
        return { x, z };
      }
    }
    return null;
  };

  // Static blocks to walk around or jump onto.
  for (let i = 0; i < 5; i++) {
    const hx = range(0.6, 1.4), hy = range(0.35, 0.9), hz = range(0.6, 1.4);
    const p = place(hx, hz, 0.8);
    if (p) boxes.push(box('block', p.x, hy, p.z, hx, hy, hz));
  }
  // Pushable crates.
  for (let i = 0; i < 3; i++) {
    const p = place(0.4, 0.4, 0.8);
    if (p) boxes.push(box('crate', p.x, 0.4, p.z, 0.4, 0.4, 0.4, 0, true));
  }
  // Pickups: one on the platform (reached by the ramp), the rest on the ground.
  const pickups: Vec3[] = [{ x: PLATFORM.x, y: PLATFORM.height + 1, z: PLATFORM.z }];
  for (let i = 0; i < 3; i++) {
    const p = place(0.5, 0.5, 0.6);
    if (p) pickups.push({ x: p.x, y: 1, z: p.z });
  }
  return { seed, size: ARENA, spawn, boxes, pickups };
}
