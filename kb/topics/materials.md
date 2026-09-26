---
title: Materials on WebGLRenderer and WebGPURenderer
slug: materials
kind: topic
summary: Which material classes work on which renderer, PBR basics, and the custom-shader paths that split between GLSL and TSL.
tags: [material, meshstandardmaterial, nodematerial, pbr, shadermaterial, webgpu]
applies_to: ">=r181"
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-core-r160-r186.md, ai-docs/research/2026-09-26-direction.md]
related: [tsl, color-management, lighting-and-shadows, post-processing]
template: html-importmap
---

# Materials on WebGLRenderer and WebGPURenderer

## Essentials

- Ordinary materials (`MeshStandardMaterial`, `MeshPhysicalMaterial`, `MeshBasicMaterial`, `MeshLambertMaterial`, `MeshToonMaterial`, `MeshMatcapMaterial`, `PointsMaterial`, `LineBasicMaterial`, `SpriteMaterial`) work unchanged on both `WebGLRenderer` and `WebGPURenderer`; three converts them into a node graph internally on the WebGPU path.
- PBR shading changed at r181: a DFG LUT, energy conservation and GGX VNDF PMREM sampling replaced the older analytic approximation. Materials with roughness above about 0.5 look brighter than they did before r181, and reflections changed; this is a rendering-quality change, not a bug, if a scene tuned on an older release now looks different.
- Custom appearance splits by renderer. On `WebGLRenderer`, write a GLSL `ShaderMaterial`/`RawShaderMaterial` or use `material.onBeforeCompile`, which is long-standing and current for that path. On `WebGPURenderer`, write a node material (`MeshStandardNodeMaterial` and friends) with TSL properties (`colorNode`, `positionNode`, `emissiveNode`, `normalNode`); see `tsl`. `ShaderMaterial`, `RawShaderMaterial` and `onBeforeCompile` are not supported by `WebGPURenderer` at all (the r186 manual says so outright; the source logs `NodeBuilder: Material "ShaderMaterial" is not compatible.` and swaps in a default node material rather than throwing).
- A limited bridge (r184) lets node materials render inside `WebGLRenderer` after `renderer.setNodesHandler( new WebGLNodesHandler() )`, with real limits: no VSM shadows, no MRT, no transmission, no WebGPU post-processing, no storage textures. It exists to prepare a migration, not as a general-purpose path.
- Fat/wide lines need a dedicated material: `LineBasicMaterial`'s `linewidth` is ignored on both renderers ("WebGL and WebGPU always render line primitives with a width of one pixel", r186 docs). Use `Line2` with `LineMaterial` (WebGL, `three/addons/lines/`) or the WebGPU `Line2` variant (`three/addons/lines/webgpu/`) for a real line width.
- `Object3D.dispose()` (new in r186) disposes the object's own GPU resources and fires a `dispose` event, but geometries, materials and textures still need their own `.dispose()` call; see `memory-and-disposal`.

## Pitfalls

- Putting a `ShaderMaterial` or `onBeforeCompile` assignment in a file that also constructs `WebGPURenderer`: this is a silent failure, not a thrown error. The console shows the `NodeBuilder` message but the mesh still renders (with a default material), so a quick look at the canvas will not catch it. `tw lint` flags the combination in one file.
- Assuming a WebGL-only material library (three-custom-shader-material, or any package built on `onBeforeCompile`) works with `WebGPURenderer` because "it's just three.js": check whether the library targets node materials before adding it to a WebGPU page.
- `TextGeometry`'s `height` option: renamed `depth` in r163, and the compatibility fallback for `height` was removed in r173, so writing `height` today is silently ignored and the extrusion defaults to 50 units. Use `depth`.
- Expecting `linewidth` on `LineBasicMaterial` to draw a visibly thicker line: it never has, on either renderer, in current three. Use `Line2`/`LineMaterial`.
- Custom material subclasses that override `dispose()`: since r186 they must call `super.dispose()` or the object's own `dispose` event never fires and any code relying on it (cleanup hooks, memory tools) misses it.

## Verify

- `tw check <page>`: `result: OK`, and no `NodeBuilder: Material "ShaderMaterial" is not compatible.` line in the console output.
- `tw lint <dir>` reports the `shadermaterial-on-webgpu` and `effectcomposer-on-webgpu` context rules from `kb/rules/lint-rules.json` for a page that mixes the GLSL path with `WebGPURenderer`, and the `linewidth-basic` rule for a `LineBasicMaterial` with a `linewidth` above 1.
- `tw scene <page>` lists each mesh's material type, useful for spotting a `ShaderMaterial` that slipped into a WebGPU scene.

## Notes

- 2026-09-26: written from the core r160-r186 research (sections 3, 4, 6) and the direction research (sections 2.2, 3.3, 3.4), checked against `node_modules/three/src/materials/` and `examples/jsm/lines/` in the installed 0.186.1.
