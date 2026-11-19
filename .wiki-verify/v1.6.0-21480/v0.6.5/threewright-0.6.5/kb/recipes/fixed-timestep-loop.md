---
title: Fixed timestep loop
slug: fixed-timestep-loop
kind: recipe
summary: Accumulate real time and step a simulation in fixed increments, interpolating the rendered transform so motion looks smooth at any frame rate.
tags: [fixed timestep, timer, simulation, physics, interpolation, accumulator]
applies_to: ">=r183"
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-games.md]
related: [animation-and-time, render-on-demand]
template: html-importmap
---

# Fixed timestep loop

## Goal

Decouple simulation (physics, game logic) from the variable render frame rate. Accumulate real elapsed time, run the simulation in fixed-size steps, cap how many steps a single slow frame can run, and interpolate the rendered transform between the last two simulation states so motion looks smooth on any display regardless of its refresh rate.

## Code

```js
import * as THREE from 'three';

const STEP = 1 / 60;
const MAX_STEPS = 4; // a slow frame drops time instead of spiraling into more and more catch-up work

const timer = new THREE.Timer();
timer.connect(document); // Page Visibility API: no giant delta after a hidden tab comes back

let accumulator = 0;
let paused = false;

// Keep the previous and current simulation transform so the render step can
// interpolate between them, instead of snapping to whichever one just ran.
const previous = new THREE.Vector3();
const current = new THREE.Vector3();

function stepSimulation(dt) {
  previous.copy(current);
  // ... advance your simulation by exactly dt seconds here ...
  current.x += 2 * dt; // placeholder motion
}

renderer.setAnimationLoop((time) => {
  timer.update(time);
  const dt = Math.min(timer.getDelta(), 0.25); // clamp a huge delta (a debugger pause, a dropped tab) too

  if (!paused) {
    accumulator += dt;
    let steps = 0;
    while (accumulator >= STEP && steps < MAX_STEPS) {
      stepSimulation(STEP);
      accumulator -= STEP;
      steps++;
    }
    if (steps === MAX_STEPS) accumulator = 0; // drop remaining time rather than spiral
  }

  const alpha = accumulator / STEP; // 0..1: how far between "previous" and "current" this render frame falls
  mesh.position.lerpVectors(previous, current, alpha);

  renderer.render(scene, camera);
});
```

Read input once per simulation step (`sim.step()`), not once per render frame, if the simulation is deterministic and input timing matters (a platformer's jump buffer, a physics query): sampling input at render-frame granularity ties gameplay feel to the display's refresh rate. Mouse-look and camera-only motion are the exception; read those every render frame for low latency, and only feed the results into the fixed-step simulation.

## Verify

- Count steps, not frames. Give the page a step counter and a function that samples it over a few real seconds, then run `tw check <page> --eval "measure()"`: steps per second must be 60 (1 / STEP) whatever the frame rate, and the largest accumulator seen must stay under STEP. `renderer.info.render.frame` only shows the display rate.
- Block the main thread once (a busy loop of 1000 ms inside the measured window): steps per second drop because the 0.25 s delta clamp and `MAX_STEPS` throw the lost time away, and the accumulator still stays under STEP. That is the no-spiral guarantee.
- `tw video <page> --seconds 2 --fps 30` and `--fps 60` (virtual clock), then compare frames at the same time: `tw diff` of the last frames should PASS. A large offset means something still moves per render frame instead of per step.
- Verified 2026-09-26 on Windows 11, Chrome 153 headless, RTX 5060 Ti (WebGL), three 0.186.1 from node_modules. Harness: the recipe loop unchanged, plus a step counter and an x wrap so the box stays in view. `tw check --eval "measure()"` printed `steps/s 60.3 frames/s 60.0 maxAccumulator 0.0167 (STEP 0.0167)`. With a 1000 ms block, `measure(1000)` printed `steps/s 46.2 frames/s 45.5 maxAccumulator 0.0166`. Videos at 30 and 60 fps: the frames at 2 s differed in 7 pixels (`tw diff` PASS); the frames at 1 s differed in 645 pixels (0.124%), a one or two pixel shift at the box edges seen in the diff image. `tw lint` found 0 errors and 0 warnings; the `tw shot` showed the box.

## Notes

- 2026-09-26: written from the games research (section 2.1), which documents this exact accumulator/interpolation pattern (citing Glenn Fiedler, "Fix Your Timestep!") built on `THREE.Timer`, cross-checked against `node_modules/three/src/core/Timer.js` in the installed 0.186.1.
- 2026-09-26: ran it (see Verify). The code was right. Rewrote Verify to measure steps per second with a page hook, since frame count only reflects the display rate.
