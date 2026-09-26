---
title: Rapier
slug: rapier
kind: library
summary: WASM physics engine for three.js games; the 0.21.0 line adds soft bodies and changed several method signatures from 0.19 and 0.20.
tags: [rapier, physics, wasm, rigidbody, character controller, determinism, snapshot]
applies_to: ">=r159"
status: current
renderer: none
last_verified: 2026-09-26
sources: [https://github.com/dimforge/rapier, https://github.com/dimforge/rapier/blob/master/bindings/typescript/CHANGELOG.md, ai-docs/research/2026-09-26-games.md, ai-docs/research/2026-09-26-ecosystem-libraries.md]
related: [react-three-rapier, jolt-physics, games, fixed-timestep-loop, seeded-randomness]
template: game-starter
package: "@dimforge/rapier3d-compat"
version_checked: "0.21.0"
---

# Rapier

## Use it for

- The default physics engine for a three.js game: rigid bodies, colliders, joints, a kinematic character controller, and (since 0.21.0) soft bodies.
- Server-authoritative multiplayer: `@dimforge/rapier3d-compat` runs the same way in Node 22 as in the browser, so one `sim/` module can run on both sides.
- Deterministic replays on one machine: `World.takeSnapshot()` and `World.restoreSnapshot()` round-trip exactly within a single build.

## Avoid it when

- The scene has only a handful of static props with no dynamic bodies: `three-mesh-bvh`'s capsule-against-BVH example is lighter than a full physics world.
- Cross-platform bit-for-bit determinism is required (lockstep netcode, replay files shared between machines): only the `-deterministic` builds (`@dimforge/rapier3d-deterministic-compat`) promise that; the regular compat build is only locally deterministic, and a different build gives a different hash for the same scene.
- Bundle size is critical and the project can drop Node/no-bundler support: `@dimforge/rapier3d` (non-compat) saves about 300 KB brotli over `-compat` but needs a bundler that can import a `.wasm` file as an ES module.

## Setup

Versions checked 2026-09-26: `@dimforge/rapier3d-compat` 0.21.0 (2026-09-25). WASM is inlined as base64 in the compat build, so no separate `.wasm` fetch or bundler config is needed. 0.21.0 adds soft bodies and moved low-level pipeline signatures (`PhysicsPipeline.step`, `ColliderSet.remove` and others now take the `SoftBodySet`); it cannot load snapshots taken with older versions. 0.20.0 (2026-08-08) moved the compat files into `dist/`, so deep imports and pinned CDN URLs must add `dist/`.

```sh
npm install @dimforge/rapier3d-compat@0.21.0
```

```js
import RAPIER from '@dimforge/rapier3d-compat';
await RAPIER.init(); // required once before any other call

const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
world.timestep = 1 / 60; // keep fixed; step it from an accumulator, not from wall-clock delta

const ground = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
world.createCollider(RAPIER.ColliderDesc.cuboid(5, 0.1, 5), ground);

const controller = world.createCharacterController(0.01);
controller.enableAutostep(0.5, 0.2, true);
controller.enableSnapToGround(0.2);
```

## Pitfalls

- Do not copy `examples/jsm/physics/RapierPhysics.js` from three.js itself into a game: the dev branch pins Rapier 0.17.3 from a third-party CDN (`cdn.skypack.dev`) and steps the world with `setInterval` and a variable dt, both of which the three.js manual's own physics page recommends against.
- Never step physics with `1/60` per rendered frame; on a 120 Hz display that runs the simulation twice as fast. Accumulate real time and step in fixed `world.timestep` chunks, capped at a few steps per frame.
- Rapier 0.21 changed method signatures from 0.19 and 0.20; `@react-three/rapier` 2.2.0 still pins 0.19.2, so mixing the two in one project gives two incompatible copies.
- Never persist a raw `takeSnapshot()` byte array as a player save; a Rapier upgrade cannot read an older snapshot. Save gameplay state (position, health, inventory) as versioned JSON instead.
- `world.createCharacterController` returns a controller object with no body; drive a kinematic body's `setNextKinematicTranslation` with `computedMovement()` after `computeColliderMovement()`, do not call `setTranslation` directly (the official Rapier character controller example does this and skips gravity).

## Notes

- 2026-09-26: written from the 2026-09-26 research (games, ecosystem-libraries). The 0.21.0 release is one day old at time of writing; patch releases and the determinism wording in Rapier's own docs are likely to move.
