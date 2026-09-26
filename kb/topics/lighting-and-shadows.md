---
title: Lighting and shadows
slug: lighting-and-shadows
kind: topic
summary: Physical light types and units, shadow map setup on both renderers, and SunLight for large outdoor scenes.
tags: [lights, shadows, shadowmap, sunlight, csm, pcf, decay, intensity]
applies_to: ">=r165"
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-core-r160-r186.md, ai-docs/research/2026-09-26-direction.md, ai-docs/research/2026-09-26-games.md]
related: [color-management, materials, environment-lighting, performance]
template: html-importmap
---

# Lighting and shadows

## Essentials

- Only physical lighting exists since r165 (`useLegacyLights` removed). `AmbientLight`, `HemisphereLight`, `DirectionalLight` and `RectAreaLight` intensity is in lux-like relative units; `PointLight` and `SpotLight` intensity is candela with `decay` defaulting to 2 (inverse-square, since r147). Lit materials (`MeshStandardMaterial` and friends) render black with no light and no `scene.environment` at all; see `environment-lighting`.
- Shadows: `renderer.shadowMap.enabled = true`, then per light `light.castShadow = true` and per mesh `mesh.castShadow` / `mesh.receiveShadow`. `renderer.shadowMap.type` defaults to `PCFShadowMap`, which is soft since r182 (Vogel disk sampling with interleaved gradient noise). `PCFSoftShadowMap` is deprecated (WebGL, r182) and its code path is fully gone in both renderers in r186: setting it logs a warning and the renderer switches to `PCFShadowMap`. `VSMShadowMap` remains for soft area shadows that need blur control.
- Fit the shadow camera tightly to what needs a shadow: a `DirectionalLight`'s `shadow.camera` is an orthographic box you must size (`light.shadow.camera.left/right/top/bottom`) and its `shadow.mapSize` (default 512, commonly raised to 1024 or 2048) trades resolution for memory. A shadow camera that is much bigger than the scene gives blocky, low-resolution shadows.
- Large outdoor scenes: `SunLight` (`three/addons/lights/SunLight.js`, new in r186) gives a directional sun with two cascaded shadow maps out of the box, no `target` (it shines from its position toward the origin), 1024x1024 per cascade by default, cascades fitted to the view frustum with a 10% blend. It works directly in `WebGLRenderer`; on `WebGPURenderer` register it first with `renderer.library.addLight( SunLightNode, SunLight )` (`SunLightNode` from `SunLightNode.js`). The older `CSM` addon (WebGL) and `CSMShadowNode` (WebGPU) remain for more than two cascades.
- Every shadow-casting light adds depth passes (six for a point light), so budget one primary shadow-casting light (a sun or a key light) per scene rather than shadows on every light. For a static level, set `renderer.shadowMap.autoUpdate = false` and flag `light.shadow.map` for update only when something that casts a shadow moves.
- WebGPURenderer-only lighting features in r186: `ClusteredLighting` (replaces the removed `TiledLighting`, r185) for many lights, `VXGINode` for voxel global illumination, and the WebGPU `LightProbeGrid` (the WebGL equivalent was renamed `LightProbeGridWebGL` in r186, alongside `LightProbeGridHelperWebGL`).

## Pitfalls

- Porting pre-r155 light intensities unchanged: they read as roughly 3x too dark (the removed PI factor) and, for point/spot lights, fall off much faster than before (decay 2 vs the old default of 1). Multiply legacy ambient/hemisphere/directional/point/spot intensities by `Math.PI` as a starting point, then retune point and spot lights further for the decay change (see `recipes/upgrade-an-old-project`).
- Setting `renderer.shadowMap.type = THREE.PCFSoftShadowMap` and expecting a visibly different (softer) shadow than `PCFShadowMap`: since r182 they render the same way, and r186 logs "PCFSoftShadowMap has been removed. Using PCFShadowMap instead." Use `PCFShadowMap` directly.
- Forgetting `mesh.receiveShadow` on the floor: the classic "the shadow-casting mesh looks fine but nothing shows the shadow" bug. `tw check`'s runtime warnings flag `a light casts shadows but renderer.shadowMap.enabled is false`, but a missing `receiveShadow` on one mesh is not a message you get in text; check the scene graph or a screenshot.
- An undersized or misaligned shadow camera: shadows disappear past its bounds, or look pixelated because the box is too large for the map size. Compute the box from the scene's `Box3` rather than guessing numbers.
- Adding `SunLight` to `WebGPURenderer` without registering `SunLightNode` first: the light exists but casts no shadow and may not render at all on that backend.

## Verify

- `tw check <page>` reports `CHECK a light casts shadows but renderer.shadowMap.enabled is false` when shadows are half-wired, and the `pixels:` line's brightness catches an unlit (black) scene.
- `tw scene <page>` shows `castShadow`/`receiveShadow` state per mesh in the tree so you can spot a floor that never got `receiveShadow = true`.
- `tw lint <dir>` flags `PCFSoftShadowMap` (rule `pcf-soft-shadow-map`) with the fix to `PCFShadowMap`, and flags `useLegacyLights`/`physicallyCorrectLights` if either survives in old code.

## Notes

- 2026-09-26: written from the core r160-r186 research (sections 1, 3, 4, 6) and the direction research (section 4.2), checked against `node_modules/three/src/renderers/webgl/WebGLShadowMap.js`, `WebGLLights.js` and `examples/jsm/lights/SunLight.js` in the installed 0.186.1.
