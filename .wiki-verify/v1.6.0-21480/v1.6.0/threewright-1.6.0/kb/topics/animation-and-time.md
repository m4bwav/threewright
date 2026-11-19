---
title: Animation and time
slug: animation-and-time
kind: topic
summary: THREE.Timer replaces Clock, drive motion from elapsed time or delta, and the fixed-timestep pattern for simulation.
tags: [timer, clock, animation, delta, setAnimationLoop, mixer, fixed timestep]
applies_to: ">=r183"
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-core-r160-r186.md, ai-docs/research/2026-09-26-games.md, kb/recipes/capture-stills-and-video.md]
related: [fixed-timestep-loop, render-on-demand, capture-stills-and-video]
template: html-importmap
---

# Animation and time

## Essentials

- Use `renderer.setAnimationLoop(fn)`, never a hand-rolled `requestAnimationFrame` loop: it is required for WebXR to work at all, and it is what makes `tw video`'s virtual clock able to drive the page deterministically (see `capture-stills-and-video`).
- `THREE.Clock` is deprecated since r183 ("This module has been deprecated. Please use THREE.Timer instead."). Use `THREE.Timer` (in core since r179): call `timer.update(time)` once per frame with the timestamp `setAnimationLoop` gives you, then read `timer.getDelta()` or `timer.getElapsed()` in seconds. `timer.connect(document)` enables the Page Visibility API so a backgrounded tab does not hand you one giant delta when it comes back; `timer.setTimescale()` scales all future deltas (a pause is `setTimescale(0)`); `timer.dispose()` disconnects.
- Drive every animated property from elapsed time or delta, never from a fixed per-frame increment (`mesh.rotation.y += 0.01`): a per-frame constant makes motion speed depend on frame rate, which is wrong for both real playback (a fast machine spins faster) and for deterministic capture (`tw video` renders any frame rate the same way only if motion is time-driven).
- `AnimationMixer` for glTF or skeletal clips: create one per model, `mixer.update(delta)` once per frame from the same `Timer` delta used elsewhere, `mixer.clipAction(clip).play()`. Do not step it from `Date.now()` deltas.
- Simulation and physics need a fixed timestep, separate from the variable render delta: accumulate real time, step the simulation in fixed increments, and interpolate the rendered transform between the last two simulation states so motion stays smooth at any display frame rate. See `fixed-timestep-loop` for the full pattern.

## Pitfalls

- `new THREE.Clock()` still works today but is deprecated and will be removed on the project's usual timeline; write `Timer` in new code. `tw lint`'s `clock` rule flags it.
- Importing `Timer` from its old addon path (`three/addons/misc/Timer.js`): that file was removed in r179 when `Timer` moved into core. Import it from `'three'` (`import { Timer } from 'three'` or `THREE.Timer`).
- A per-frame constant increment instead of delta-driven motion: it looks fine live on one machine and then plays back at the wrong speed in a captured video, or drifts under `tw check --eval` frame stepping. `tw check`'s runtime warnings and a two-frame pixel diff both catch a frozen or frame-rate-dependent animation.
- Not calling `timer.connect(document)`: a tab that was backgrounded for a while and comes back produces one large delta on the next `update()`, which can snap a physics simulation or a camera flight forward visibly.
- Mixing `Timer.getDelta()` with a separately maintained `Date.now()` delta for the same motion: pick one clock per page and drive everything from it, or different systems drift out of sync with each other.

## Verify

- `tw check <page> --eval "renderer.info.render.frame"` or a scene-graph diff across two `tw scene` calls a known time apart confirms the loop is advancing at all.
- `tw video <page>` prints its frame count, fps and driver (`virtual clock` or `page renderFrame()`); a wrong frame count for the requested `--seconds`/`--fps` means motion is not purely time-driven (see `capture-stills-and-video`).
- `tw lint <dir>` flags `new THREE.Clock(` (rule `clock`) and the old `Timer` addon path (rule `timer-addon-path`).

## Notes

- 2026-09-26: written from the core r160-r186 research (sections 1, 2) and the games research (section 2.1, the fixed-timestep pattern with `THREE.Timer`), checked against `node_modules/three/src/core/Timer.js` and `Clock.js` in the installed 0.186.1.
