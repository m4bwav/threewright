---
title: camera-controls
kind: library
slug: camera-controls
summary: Renderer-agnostic orbit and dolly controls with fitToBox and scripted transitions; a drei dependency and a common OrbitControls upgrade for product viewers.
tags: [camera, orbit, dolly, controls, fit to box, transitions, product viewer]
applies_to: ">=r159"
status: current
renderer: both
last_verified: 2026-09-26
sources: [https://github.com/yomotsu/camera-controls, ai-docs/research/2026-09-26-ecosystem-libraries.md]
related: [cameras-and-controls, product-viewer, fit-camera-to-object]
package: "camera-controls"
version_checked: "3.1.2"
---

# camera-controls

## Use it for

- Product viewers and configurators that need smoother, more configurable orbit and dolly behavior than `OrbitControls`: damping curves, min/max distance and polar angle, boundary boxes, and named transitions.
- `fitToBox(object, enableTransition)` to frame a loaded model automatically, and `setLookAt(...)` / `moveTo(...)` for scripted camera moves (a guided tour, a "reset view" button).
- Any renderer: it drives a plain camera object, so it works the same on `WebGLRenderer` and `WebGPURenderer`.

## Avoid it when

- The scene only needs the basics `OrbitControls` already gives (rotate, pan, zoom with damping): adding a dependency for that is not worth it.
- Gameplay cameras: this is an orbit/dolly editor-style control, not a first- or third-person rig. Use a hand-written spring-arm or FPS camera for games (see the `games` scenario).

## Setup

Versions checked 2026-09-26: `camera-controls` 3.1.2 (2025-11-17), peer `three >=0.126.1`. Renderer-agnostic: no peer on `@react-three/fiber` or `@react-three/drei`, though drei's `CameraControls` component wraps this package.

```sh
npm install camera-controls@3.1.2
```

```js
import CameraControls from 'camera-controls';
import * as THREE from 'three';

CameraControls.install({ THREE }); // inject the THREE build once, before creating an instance

const controls = new CameraControls(camera, renderer.domElement);
controls.dollyToCursor = true;

// call every frame; returns true when it changed, so you can render on demand
function animate(time) {
  const delta = clock.getDelta();
  const updated = controls.update(delta);
  if (updated) renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
```

```js
// frame a loaded model with a smooth transition
controls.fitToBox(loadedObject, true, { paddingLeft: 0.1, paddingRight: 0.1 });
```

## Pitfalls

- `CameraControls.install({ THREE })` must run once, with your project's exact `THREE` module, before any instance is created; skipping it or passing a mismatched `THREE` build throws or breaks matrix math.
- `update(delta)` returns whether the camera actually moved; use that return value to render only when needed (`render-on-demand`) instead of rendering every frame regardless.
- Dispose with `controls.dispose()` on scene teardown to remove its pointer event listeners, or they leak across page navigations in an SPA.
- It manipulates the camera object directly; if something else (drei's `OrbitControls`, a scroll library) also writes to the camera transform in the same frame, the two will fight. Use one camera controller at a time.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries).
