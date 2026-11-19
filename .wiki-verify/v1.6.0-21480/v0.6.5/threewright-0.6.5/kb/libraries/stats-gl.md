---
title: stats-gl
kind: library
slug: stats-gl
summary: FPS, CPU and GPU timing overlay for WebGL and WebGPU; the current replacement for stats.js and r3f-perf.
tags: [stats, fps, performance, gpu timing, debug, overlay, hud]
applies_to: ">=r159"
status: current
renderer: both
last_verified: 2026-09-26
sources: [https://github.com/RenaudRohlinger/stats-gl, ai-docs/research/2026-09-26-ecosystem-libraries.md, ai-docs/research/2026-09-26-games.md]
related: [performance, three-mesh-bvh, games]
package: "stats-gl"
version_checked: "4.2.3"
---

# stats-gl

## Use it for

- A frame-rate and timing HUD during development, on either renderer: stats-gl 4.x reports CPU and GPU timing for `WebGLRenderer` and `WebGPURenderer`.
- Replacing `stats.js` (dat.gui-era, last release 2016) and `r3f-perf` (stale since 2024, depends on drei ^9) in any current project.
- Gating a debug overlay behind a query flag (`?debug=1`) in a shipped game, as the `game-starter` template does.

## Avoid it when

- Shipping to end users by default: keep it dev-only or behind a flag, since a visible FPS counter is not something most products want live.
- The renderer is old enough that GPU timing extensions are unavailable; it still shows CPU-side numbers there, but check the console for a warning about missing timer query support.

## Setup

Versions checked 2026-09-26: `stats-gl` 4.2.3 (2026-07-10). drei 10 still pulls `stats-gl ^2.2.8` for its `StatsGl` component, so a project that also installs 4.x directly can end up with two versions; that is usually harmless since it is a display-only tool, but keep it in mind when debugging.

```sh
npm install stats-gl@4.2.3
```

```js
import Stats from 'stats-gl';

const stats = new Stats({ trackGPU: true, trackHz: true, trackCPT: true });
document.body.appendChild(stats.dom);

renderer.setAnimationLoop((time) => {
  stats.begin();
  renderer.render(scene, camera);
  stats.end();
  stats.update();
});
```

In React Three Fiber, prefer drei's wrapper over the older `r3f-perf`:

```jsx
import { StatsGl } from '@react-three/drei';
<StatsGl trackGPU />
```

## Pitfalls

- Older stats-gl versions broke on WebGPU after r181 changed async renderer methods (a three.js forum thread flags this); 4.x is the version confirmed to track both renderers correctly.
- GPU timing needs a timer-query extension the browser or backend may not expose (some mobile GPUs, some WebGPU implementations); the panel then reads 0 or is blank instead of erroring, so do not treat a zero GPU number as "instant".
- `trackGPU: true` adds overhead of its own; disable it for a quick CPU-only check on a tight budget.
- For `WebGPURenderer`, three's own Inspector (`three/addons/inspector/Inspector.js`, WebGPU-only, r181+) gives a fuller Performance/Memory/Timeline view; use stats-gl for a small always-on HUD and the Inspector for deep profiling.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries, games).
