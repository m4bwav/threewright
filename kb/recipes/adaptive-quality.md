---
title: Adaptive quality
slug: adaptive-quality
kind: recipe
summary: Step quality down and up from measured frame time without flapping, pixel ratio first, with a guard for scenes that are not fill-bound.
tags: [adaptive quality, dynamic resolution, pixel ratio, frame time, hysteresis, governor, performance]
applies_to: any
status: current
renderer: both
last_verified: 2026-11-28
sources: [https://github.com/kevintngo/voidlight, https://github.com/kevintngo/lumenwake, https://github.com/kevintngo/cinderwatch, templates/game-starter/src/quality.ts]
related: [performance, resize-and-pixel-ratio, lighting-and-shadows]
template: game-starter
---
<!-- harvestwright: kevintngo-voidlight https://github.com/kevintngo/voidlight tier - 2026-11-28 -->
<!-- harvestwright: kevintngo-lumenwake https://github.com/kevintngo/lumenwake tier - 2026-11-28 -->
<!-- harvestwright: 1y66rh1-render https://github.com/kevintngo/cinderwatch tier - 2026-11-28 -->

# Adaptive quality

## Goal

Hold the frame rate on slow devices by lowering quality in steps, raise it again when there is room, and never flap between two levels. The controller is a pure function of frame time, so it is tested in Node with synthetic traces. It lives in the `game-starter` template as `src/quality.ts`.

Rules it follows, each from a shipped browser game (parameters read from their code, not measured on a phone here):

- Decide from a moving average of frame time (each frame counts 6%, start at 16.7 ms), never from one frame. Ignore frames over 100 ms and skip hidden tabs.
- Asymmetric timing. Step down after 1.1 s over 19.5 ms, then wait 2.5 s. Step up only after 6 s under 17.4 ms, then wait 3 s. Slow time drains at double speed when the average recovers; fast time must be unbroken.
- Anti-flap bar. A step down within 8 s of a step up means the upper level cannot hold: bar it for 90 s.
- Futility guard. If two steps down in a row each gained under 1 ms, the frame is not limited by what the levels control (it is CPU work, not pixels). Go back to the level before the run and hold 21 s, doubling each time up to 480 s. `state.futile` counts these, so the game can cut simulation work instead.
- Levels set several things together, cheapest change first: pixel ratio, then shadow map size, then post-processing samples and particle share. Five levels is enough.

## Code

The controller and its level table (`templates/game-starter/src/quality.ts`) have no three.js in them. Wiring in the render loop:

```js
import { createQuality, stepQuality, QUALITY_LEVELS } from './quality.ts';

const basePixelRatio = Math.min(window.devicePixelRatio, 2);
let quality = createQuality(); // starts at the top level; pass 2 or 3 on a coarse-pointer device

function applyQuality(level) {
  const q = QUALITY_LEVELS[level];
  renderer.setPixelRatio(basePixelRatio * q.pixelRatioScale);
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (sun.shadow.mapSize.width !== q.shadowMapSize) {
    sun.shadow.mapSize.set(q.shadowMapSize, q.shadowMapSize);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } // rebuilt at the new size
  }
  particles.count = Math.floor(particles.userData.max * q.effects);
}

let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = (now - last) / 1000;
  last = now;
  if (!document.hidden) {
    const next = stepQuality(quality, dt, now / 1000);
    if (next.level !== quality.level) applyQuality(next.level);
    quality = next;
  }
  renderer.render(scene, camera);
});
```

Set `quality.locked = true` from a settings menu or a test hook to hold a level.

A resolution-only governor is the same idea with a continuous scale instead of levels. One game's numbers: decide every 700 ms; with the GPU timer query (`EXT_disjoint_timer_query_webgl2`), smoothed at 0.15 per sample, shrink the scale by 0.05 over 13 ms and by 0.12 over 20 ms, grow by 0.05 under 8.5 ms; without the timer use the frame average (8% per frame): shrink 0.06 over 21.5 ms, grow 0.05 after five periods under 17.6 ms. Keep the scale between 0.45 and 1.5 of CSS pixels and start at 0.8 (0.62 on weak devices). At the minimum and still slow (GPU over 19 ms or frame over 30 ms), drop shader step counts. Another game uses 2 s windows: two windows over 22.5 ms drop 0.15 (floor 0.55) and hold 12 s, doubling to 480 s; three windows under 18.6 ms raise it; touch devices start at 0.85.

## Verify

- `npm test` in a `game-starter` project (or `node --test templates/game-starter/tests/quality.test.ts` here) runs six trace tests: steady 25 ms steps down once within 3 s and not again inside the wait; steady 12 ms climbs one level per 9 s; a level that is slow only at the top is barred after the first bounce and stays put for 90 s; frames over 100 ms change nothing; a trace slow at every level trips the futility guard; the level table never raises cost going down.
- Measured 2026-11-28: a real 660-frame trace (11 s at 60 fps, p50 16.7 ms, max 17.2 ms, headless Chrome on an RTX 5060 Ti) replayed through `stepQuality`: no change from the top level, one step up after 6.0 s from level 3. The same trace with every frame 1.5x longer (25 ms at every level): down at 1.3 s and 5.0 s, then back to the start level at 8.7 s by the futility guard.
- Is the page fill-bound at all? Run `tw perf <page> --dpr 1` and `tw perf <page> --dpr 0.5` on a real GPU. If p50 does not fall by about 15% at the lower ratio, lowering resolution will not help: cut draw calls or script work instead.
- The wiring snippet above was not run in a page (2026-11-28); the template does not call the controller yet.

## Notes

- 2026-11-28: written fresh as a technique harvest from three browser games by one author: the level controller, its timings and the anti-flap bar from a no-engine fighter (no licence, ideas and numbers only), the resolution governor and futility guard from a raymarched action RPG (MIT), and the doubling hold from a tower-defence game (MIT). Their measured gain on a desktop GPU was small (under 0.5 ms a frame for the shadow and blur cuts); the case for the controller is phones, which were not measured.
