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

- `tw check <page> --eval "renderer.info.render.frame"` rising at real wall-clock speed (not faster or slower) confirms the loop's overall pacing is correct.
- `tw video <page> --seconds 4 --fps 30` then `--fps 60` on the same page should show identical motion at both frame rates (the simulation ran the same number of fixed steps either way); a difference in speed means something is still driving motion from render-frame count instead of the accumulator.
- `tw check <page> --eval "<your own accumulator/step debug hook>"` lets you confirm the accumulator never grows unbounded on a slow machine, which is what `MAX_STEPS` exists to prevent.

## Notes

- 2026-09-26: written from the games research (section 2.1), which documents this exact accumulator/interpolation pattern (citing Glenn Fiedler, "Fix Your Timestep!") built on `THREE.Timer`, cross-checked against `node_modules/three/src/core/Timer.js` in the installed 0.186.1.
