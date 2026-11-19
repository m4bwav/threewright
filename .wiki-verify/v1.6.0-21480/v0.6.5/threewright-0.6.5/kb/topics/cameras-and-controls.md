---
title: Cameras and controls
slug: cameras-and-controls
kind: topic
summary: Perspective versus orthographic cameras, OrbitControls setup and its default keyboard behavior, and which controls fit which interaction.
tags: [camera, orbitcontrols, perspective, orthographic, controls, keyboard]
applies_to: ">=r175"
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-core-r160-r186.md, ai-docs/research/2026-09-26-games.md, ai-docs/research/2026-09-26-3d-dataviz-and-docs.md]
related: [fit-camera-to-object, keyboard-orbit-and-reduced-motion, resize-and-pixel-ratio]
template: html-importmap
---

# Cameras and controls

## Essentials

- `PerspectiveCamera(fov, aspect, near, far)` for anything that should look like real depth; `OrthographicCamera(left, right, top, bottom, near, far)` for isometric views, 2D-in-3D UI, or CAD-style elevations where parallel lines must stay parallel. `aspect` on a perspective camera must track the canvas: see `resize-and-pixel-ratio`.
- `OrbitControls` (`three/addons/controls/OrbitControls.js`) is the default for inspection and product-viewer style interaction: orbit, zoom, pan around a `target` point. Set `controls.enableDamping = true` for inertia (call `controls.update()` every frame when damping is on) and `controls.target.set(...)` to whatever point the camera should orbit around, not the origin by default.
- Since r169, `Controls` (the shared base class) defaults `domElement` to `null` and, since r175, `connect()` requires an element: build controls with the element already (`new OrbitControls(camera, renderer.domElement)`), or call `controls.connect(renderer.domElement)` before use, or nothing responds to input.
- Arrow-key behavior is pan by default, not rotate: `OrbitControls._handleKeyDown` maps plain arrow keys to `_pan()` and only rotates when Ctrl, Meta or Shift is held with the arrow key (checked against the installed 0.186.1 source). Keys are inert until you call `controls.listenToKeyEvents(window)` (or an element) and give the canvas `tabindex="0"` for focus. See `keyboard-orbit-and-reduced-motion` for an accessible key scheme that adds a dedicated rotate binding.
- Other controls for other jobs: `MapControls` (pan-first, like a map), `TrackballControls`/`ArcballControls` (free rotation, no fixed up vector), `FlyControls`/`FirstPersonControls` (first-person navigation; `FirstPersonControls` got a new model in r184), `PointerLockControls` (mouse-look with a locked pointer, `controls.object` not the removed `getObject()`), `TransformControls` (gizmo for moving/rotating/scaling an object; add `controls.getHelper()` to the scene, not the controls object itself, since r169), `DragControls` (`connect()`/`disconnect()`, `controls.objects`, `controls.raycaster` since r168). For orbit-only camera work without shipping the whole addons folder, `camera-controls` (npm, three peer dependency) is a common third-party alternative.
- Fit a camera to whatever it should be looking at from the scene's bounding box rather than a hand-picked distance; see `fit-camera-to-object`.

## Pitfalls

- `new OrbitControls(camera, null)` or building controls before the renderer's canvas exists: nothing responds, with no error, because `domElement` defaults to `null` and `connect()` needs a real element (`tw lint`'s `controls-without-dom-element` rule catches this).
- Expecting plain arrow keys to rotate the camera: they pan. This is a frequent source of "keyboard orbit doesn't work" reports; either teach the modifier-key combination or add a custom key handler.
- `scene.add(transformControls)`: `TransformControls` has been a `Controls` object, not an `Object3D`, since r169. Add `transformControls.getHelper()` instead, or the console logs `Object3D.add: object not an instance of THREE.Object3D.`
- `PointerLockControls.getObject()`: removed in r168. Use `controls.object`.
- Forgetting `controls.update()` in the render loop when `enableDamping` is true: input feels laggy or dead because the inertia never actually integrates.
- Not resetting `controls.target` after loading a new model: the camera orbits around wherever the target was left, often the origin, even when the model's center is somewhere else.

## Verify

- `tw check <page> --eval "camera.position.toArray()"` (or `controls.target.toArray()`) confirms the camera actually sits and orbits where you expect.
- `tw check <page>` reports a runtime warning when the camera is off the scene bounds or the aspect ratio does not match the canvas.
- `tw lint <dir>` flags controls built with no DOM element (rule `controls-without-dom-element`) and `scene.add()` on a raw `TransformControls` instance (rule `transform-controls-add`).

## Notes

- 2026-09-26: written from the core r160-r186 research (sections 1, 3) and checked directly against `node_modules/three/examples/jsm/controls/OrbitControls.js` in the installed 0.186.1 (the `_handleKeyDown` arrow-key-pans-by-default behavior was read from source, not assumed).
