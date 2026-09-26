---
title: Browser games
slug: games
kind: scenario
summary: Plain three.js plus Rapier is the default game stack; a fixed-timestep loop, an action-map input layer, and headless hooks that let a test step the game deterministically.
tags: [games, rapier, fixed timestep, input, character controller, multiplayer, vibe jam, testing]
applies_to: ">=r183"
status: current
renderer: webgpu
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-games.md, ai-docs/research/2026-09-26-video-and-games.md, ai-docs/research/2026-09-26-direction.md]
related: [rapier, three-mesh-bvh, jolt-physics, needle-engine, iwsdk, renderer-choice, fixed-timestep-loop, seeded-randomness, performance, webgpu-backend-check]
template: game-starter
---

# Browser games

## When

- A browser game (platformer, racer, shooter, physics toy, jam entry) that must run in an iframe with no login, load in seconds, and work on desktop, mobile and gamepad.
- The project needs automated, deterministic testing: same seed and inputs give the same result on reload, so an agent (or CI) can verify gameplay in text before ever looking at a screenshot.
- Not for a level editor or authoring-heavy pipeline; Needle Engine or IWSDK fit better when the content is authored in Unity, Blender or is Quest-first XR.

## Stack

| option | right when |
|---|---|
| plain three.js + Rapier | default; small to mid games, any web portal, anything `tw` must verify text-first |
| React Three Fiber + drei + @react-three/rapier + ecctrl | the app is already React, or the team thinks in components (note: @react-three/rapier pins Rapier 0.19.2, five minors behind Rapier itself) |
| Needle Engine | levels authored in Unity or Blender with components; built-in physics, networking, XR |
| Meta IWSDK | Quest-first XR games |
| Babylon.js / PlayCanvas | a full engine (editor, batteries included) is wanted; outside threewright's tw hooks and kb |

- `WebGPURenderer` (with its automatic WebGL2 fallback) is the default renderer for browser games (not XR): new rendering features land there (`ClusteredLighting`, order-independent transparency, `SSGINode`, `TRAANode`, compute particles), TSL survives future renderer changes, and a game lives long enough to be worth the port cost now. Flip to `WebGLRenderer` when the target includes Quest VR (no WebXR/WebGPU binding there), the scene has thousands of unique unbatched meshes (WebGPU is CPU-bound there today), or the game depends on WebGL-only libraries (pmndrs postprocessing, troika text).

## Build

- `templates-wip/game-starter` (Vite, TypeScript, Rapier 0.21.0, tests) exists but is **unverified** — it has no `template.json` yet and has not passed `tw check`/`tw lint`/a looked-at `tw shot`. Read it for the intended shape, but confirm each piece against current `tw check` output before relying on it.
- Loop: accumulate real time, step physics in fixed ticks (`STEP = 1/60`, capped at `MAX_STEPS = 4`), render once per frame with interpolation between the last two states. Use `THREE.Timer` with `connect(document)`, never `THREE.Clock` (deprecated r183) or `setInterval`.
- Physics: Rapier's `KinematicCharacterController` for the player (autostep, snap-to-ground, slope limits), dynamic bodies for props, colliders built from simplified collision meshes (never the render mesh). Use contact events and scene queries for gameplay collisions, never distance checks.
- Input: a small action map (`moveX`, `moveY`, `jump`, `fire`, ...) sampled once per fixed tick from keyboard (`event.code`), gamepad (`navigator.getGamepads()` polled every frame, no change events), and touch (nipplejs on coarse pointers). Pointer lock only after a click; losing it means pause.
- Assets: glTF only, optimized with `gltf-transform optimize` or `gltfpack`; clone skinned characters with `SkeletonUtils.clone`, never a plain `.clone()`. Credit CC0 sources (Kenney, Quaternius, Poly Haven) even when no attribution is legally required.
- Seeded randomness only (mulberry32 or sfc32) in any code that affects gameplay or level generation; never `Math.random()` or `Date.now()` in simulation code.
- Stay inside a performance preset: InstancedMesh/BatchedMesh for repeats, one shadow-casting `SunLight` (r186 addon) for outdoor scenes, `compileAsync` to warm shaders before play, no allocation in update code.
- Test hooks: expose `window.__game` with `state()`, `pause(on)`, `step(n)`, `hash()` (a snapshot hash), `restart(seed)` and `perf()`. Freeze the clock **before** `page.goto()` (Playwright's `clock.install()` then `pauseAt()`) — pausing after load still lets real time leak into the first several ticks, which was measured to change the tick count and hash on reload.
- Multiplayer, if needed: authoritative server (Colyseus 0.18 is the default choice), client prediction with input replay, snapshot interpolation for remote entities, never trust client positions.

## Pitfalls

- Never copy `examples/jsm/physics/RapierPhysics.js` or the official Rapier character-controller example from three.js itself into a game: they pin an old Rapier version from a third-party CDN, use `setInterval` with a variable dt, and (in the character-controller example) apply `1/60` per rendered frame, which runs twice as fast on a 120 Hz screen.
- A game that needs a loading screen or a heavy download before the first interactive frame fails the "load almost instantly" bar that portals (Poki, CrazyGames) and jams (Vibe Jam) enforce; show the live world immediately and stream the rest.
- Client-authoritative multiplayer (broadcasting your own position, trusting the client) is trivially cheatable; fly.pieter.com's netcode is the canonical cautionary example.
- Games that break inside an iframe fail judging and portal integration; test inside an iframe with no login and no popups, not only in a full-page tab.
- `@react-three/rapier`'s Rapier pin (0.19.2) means React games cannot use Rapier 0.20+ soft bodies or the changed 0.21 signatures without dropping to the raw package.

## Verify

- `node --test`: the headless sim gives the same hash twice for the same seed and inputs.
- Playwright smoke: `window.__tw.ready` resolves; holding each move action for a fixed number of ticks moves the player the correct way; jump rises then lands; the player is grounded at rest.
- Frame-rate independence: the same per-tick inputs at simulated 30, 60 and 144 fps give the same position after the same number of ticks (final tick count may differ by one from the accumulator remainder).
- Replay: the clock frozen before `page.goto()`, the same seed and key presses give the same hash on two reloads.
- `tw check` on the built game: zero console errors, zero failed requests, a sane scene summary; `renderer.info` draw calls and triangles within the chosen preset; memory flat across a restart.

## Notes

- 2026-09-26: written from the 2026-09-26 research (games, video-and-games, direction). Rapier 0.21.0 is one day old at time of writing; its compat-bundle size and the @react-three/rapier pin are the claims most likely to move soon.
