---
title: Jolt Physics
slug: jolt-physics
kind: library
summary: WASM rigid-body engine for large scenes, vehicles and character virtual controllers; three ships a JoltPhysics addon that loads it from a CDN.
tags: [jolt, physics, wasm, vehicles, character controller, rigid body]
applies_to: ">=r159"
status: current
renderer: none
last_verified: 2026-09-26
sources: [https://github.com/jrouwe/JoltPhysics.js, ai-docs/research/2026-09-26-ecosystem-libraries.md, ai-docs/research/2026-09-26-games.md]
related: [rapier, games, fixed-timestep-loop]
package: "jolt-physics"
version_checked: "1.1.0"
---

# Jolt Physics

## Use it for

- Large rigid-body scenes and vehicle physics where Jolt's `CharacterVirtual` and vehicle constraints fit better than Rapier's API.
- Projects that already use three's own `JoltPhysics.js` addon (`three/addons/physics/JoltPhysics.js`), which loads jolt-physics from jsDelivr and wires up a basic world.
- Heavier simulations where Jolt's manual memory model and multithreading (with `SharedArrayBuffer`) pay off on desktop.

## Avoid it when

- The target is a web portal in an iframe: Jolt's multithreaded builds need `SharedArrayBuffer`, which needs cross-origin isolation headers that most portal iframes do not set. The single-threaded build works everywhere but loses that benefit.
- Cross-platform determinism is required without a custom build: matching native results needs a build compiled with `-DCROSS_PLATFORM_DETERMINISTIC=ON`, which the npm package does not ship by default.
- The project already uses Rapier and does not need Jolt's specific vehicle or character features; keeping one physics engine is simpler to test and dispose.

## Setup

Versions checked 2026-09-26: `jolt-physics` 1.1.0 (2026-07-11), stable since 1.0.0 (2025-12-28). three r186's `JoltPhysics.js` addon pins jolt-physics 1.0.0 from jsDelivr; install 1.1.0 directly if you are not using the addon unmodified.

```sh
npm install jolt-physics@1.1.0
```

```js
import initJolt from 'jolt-physics';

const Jolt = await initJolt();
const settings = new Jolt.JoltSettings();
// ...configure broad phase layers, then:
const joltInterface = new Jolt.JoltInterface(settings);
const physicsSystem = joltInterface.GetPhysicsSystem();
// step with a fixed dt inside your accumulator loop:
joltInterface.Step(1 / 60, 1);
```

Manual memory management: objects created with `new Jolt.X()` must be destroyed with `Jolt.destroy(obj)` when no longer needed, or the WASM heap grows unbounded.

## Pitfalls

- Manual memory management is the biggest trap for an agent used to garbage-collected JS: every Jolt object you construct needs an explicit `destroy()` call on cleanup, including temporary vectors and shape settings used only during setup.
- Multithreaded Jolt needs `SharedArrayBuffer`, which needs `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` response headers; without them the build silently runs single threaded or throws, depending on the build.
- three's `JoltPhysics.js` addon is a thin example wrapper, not a full integration; read it before extending it, and expect to write your own character controller glue.
- `CharacterVirtual` is a kinematic-style controller like Rapier's `KinematicCharacterController`; drive it the same way (compute movement, then apply), never by teleporting a rigid body's transform directly.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries, games).
