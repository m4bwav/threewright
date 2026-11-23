---
title: Performance budgets and techniques
slug: performance
kind: topic
summary: Draw call and triangle budgets by target device, instancing and batching, and the measurements that catch a slow scene in text.
tags: [performance, draw calls, instancedmesh, batchedmesh, budget, pixel ratio, lod]
applies_to: ">=r183"
status: current
renderer: both
last_verified: 2026-11-22
sources: [ai-docs/research/2026-09-26-games.md, ai-docs/research/2026-09-26-scenarios-xr-and-testing.md, ai-docs/research/2026-09-26-direction.md]
related: [instanced-scatter, memory-and-disposal, bundle-size, renderer-choice]
template: html-importmap
---

# Performance budgets and techniques

## Essentials

- Budgets by target (Don McCurdy's rule for mobile, quoted by Utsubo 2026-09-11; Meta's native Quest guideline; threewright's own suggested desktop numbers, not an industry figure):

| Target | Draw calls | Geometry |
|---|---|---|
| Mid phone | under 100 | under 100k vertices in view |
| Desktop | a few hundred to low thousands | 500k to 1M triangles in view |
| Quest (native guideline; stay well under for WebXR) | 500-1000 max | 1-2M triangles/vertices max |

Cap `renderer.setPixelRatio` at 2 (1.5 or lower on low-end phones), and drop it further at runtime if frame time stays over budget (dynamic resolution).
- Repeated objects: `InstancedMesh` for one geometry and one material rendered many times in one draw call (per-instance transform and, since r162, morph targets). `BatchedMesh` for many different geometries sharing one material, with per-instance visibility and color (r183 added per-instance opacity and wireframe support; call `addInstance()` or nothing renders). `THREE.LOD` swaps detail level by camera distance for either.
- Frustum culling is on by default; a `SkinnedMesh` culls by its bounding sphere, which must be recomputed after loading or characters can pop at screen edges.
- Textures: cap at 2048px except a true hero asset, and prefer KTX2 (ETC1S for color maps, UASTC for normal maps) over raw JPEG/PNG for anything loaded at scale; see `loaders-and-assets`.
- Shader and pipeline warm-up: call `await renderer.compileAsync(scene, camera)` (non-blocking since r184) before the first visible frame, especially before a title screen or scroll reveal, to avoid a hitch on first use of a material or effect. `compileComputeAsync()` (r186) does the same for compute pipelines.
- Measure with `renderer.info` rather than guessing: `info.render.calls`, `triangles`, `points`, `lines`, `frame` for WebGLRenderer; `info.render.drawCalls`, `info.compute.calls`, `info.memory` by resource type for WebGPURenderer. Set `info.autoReset = false` and call `info.reset()` once per frame yourself when you render multiple passes and want one accurate count.
- WebGPURenderer-specific traps: it currently loses to WebGLRenderer on scenes with many unique, unbatched meshes and on first-use pipeline compile (three.js issue 33821, 2026-06-16: about 131 ms first render on WebGL versus about 2,100 ms on WebGPU for one material per mesh; about 16-36x slower material initialization has been reported in other issues). Profile before assuming WebGPU is faster; it wins specifically when work moves to the GPU (compute particles, sorting, culling), not for many small CPU-issued draws.

## Pitfalls

- Uncapped `devicePixelRatio` on a phone: a DPR of 3 renders 9x the pixels of DPR 1 for the same CSS size, which is the single most common "why is this slow on my phone" cause. Always cap it.
- One mesh, one draw call, thousands of times (a particle field, a forest, a crowd) instead of `InstancedMesh`: draw calls dominate CPU time long before triangle count does on most scenes.
- Skipping `compileAsync` and taking the shader-compile hit on the frame that reveals the scene (a scroll-triggered hero, a level transition): shows up as a visible stall exactly when the user is looking.
- Reading `renderer.info` without setting `autoReset = false` when you render more than once per frame (a shadow pass, a reflection pass): the counts reset after every `render()` call, so you see only the last pass's numbers.
- Switching LOD levels at round distances picked by eye: switch on projected size instead. An object of height `h` fills the fraction `s` of the screen height at distance `d = h / (2 * tan(fov / 2) * s)` (fov in radians, the camera's vertical field of view). Drop to the next level where the detail it removes would cover under about 2 pixels, since anything smaller only aliases. As levels shrink, move removed geometry into the normal map, then soften the normal map and raise roughness. Far repeats can become impostors (cards turning about their vertical axis), and a block of houses simplifies better as one cluster than house by house. `lod.addLevel(object, distance, hysteresis)` takes a hysteresis fraction (r186) that stops popping at the boundary.
- Culling only meshes by distance while effects run everywhere. Particles, decals, fog volumes and animated shader effects cost fill on every pixel they cover, so give each the same projected-size test as an LOD level: hide or freeze an emitter or effect once it covers under a few pixels, and switch whole far regions to impostors rather than keeping their effects alive. In a world larger than a few kilometres, also rebase the origin around the camera from time to time and shift the previous-frame camera with it, or temporal AA smears on the jump (see `geospatial-and-globes`, Pitfalls).
- Running a ray-marched fog or volume at full resolution. It is often the most expensive pass on screen. Render it into a smaller target and upsample: r186 `PassNode.setResolutionScale(0.5)` does this for a pass, `GodraysNode` already defaults to `resolutionScale = 0.5`, and `BilateralBlurNode` smooths the upsample along depth edges. Measured 2026-11-22 on a 1920x1080 WebGL2 raymarch (128 steps of value noise, RTX 5060 Ti via ANGLE D3D11, headless Chrome): full resolution 3.29 ms, half resolution plus a bilinear upsample 0.71 ms, full resolution at 32 steps 0.63 ms. Cap the step count too (`VolumeNodeMaterial.steps` defaults to 25). Clipping the ray to the fog's bounding slab (empty-space skipping) saves time only when the step count shrinks with the clipped length: at a fixed 128 steps the clipped march cost 3.68 ms, about the same, it just placed the samples better.
- Optimising before finding the bottleneck. Change one thing and watch frame time: halve the pixel ratio (a large drop means fill or fragment shading is the limit), cut draw calls or hide most objects (a drop means CPU submission), simplify materials to `MeshBasicMaterial` (a drop means shading). If none moves it, the cost is in your own JavaScript. Dense tiny triangles (grass, over-tessellated meshes) also cost pixel time, since the GPU shades 2x2 pixel quads (Real-Time Rendering 4e §18.2, pp. 786-787).
- Averaging fps or adding fps costs. Fps is a reciprocal: report mean, p95 and worst frame time in ms, and add effect costs in ms (a 2 ms bloom is 2 ms at any frame rate). Measure with the vsync cap in mind, repeat runs, and compare A/B on one machine because clocks drift with heat (RTR 4e §18.3, pp. 788-789).
- Assuming WebGPURenderer is a free performance upgrade: for CPU-bound scenes with many unique draws it can be several times slower to first render than WebGLRenderer on the same hardware. See `renderer-choice`.

## Verify

- `tw check <page>` prints draw calls and triangle counts in its scene summary and flags "slow or janky" territory (draw calls over about 100 on phones or 1000 anywhere; triangles in the millions) with a fix hint pointing at instancing.
- `tw check <page> --eval "renderer.info.render.calls"` (or `renderer.info.render.drawCalls` on WebGPU, where `render.calls` counts `render()` calls since start) gives the exact number to compare against the budget table.
- `tw perf <page> --seconds 5` prints frame time p50, p95, p99 and max, frames over 33 ms, draw calls and triangles per frame, and geometry, texture and heap growth. Add `--cpu-throttle 4` for a slow-device estimate. `--fly "<js using u, camera, scene>"` moves the camera along a fixed path (u runs 0 to 1), or bare `--fly` calls the page's `window.flyThrough(u)`; `--target-ms 16.7` exits 1 when p95 is over (added 1.3.0, 2026-11-14). Headless numbers are uncalibrated: compare runs on one machine, do not quote them as device fps. Headless Chrome with a GPU ran at a 60 fps vsync cap on 2026-09-26, so look at p95, p99 and max rather than fps.
- `tw check <page> --save before.json`, change the code, then `tw check <page> --against before.json` lists what moved: draw calls, triangles, geometries, textures, object types, new or gone problems, and the share and region of the frame that changed.
- `tw scene <page>` collapses repeated siblings (`Mesh x240 'bolt'`), which is the fastest way to spot "this should be an InstancedMesh" in text before touching a screenshot.

## Notes

- 2026-09-26: written from the games research (sections 2.1, 3) and the scenarios research (section B5), with the WebGPU-versus-WebGL performance numbers from the direction research (section 3.5, three.js issues 30560, 31055, 33821).
- 2026-11-19: bottleneck test order and ms-not-fps from Real-Time Rendering 4e §18.2-18.3 (round 6 books track); `MeshBasicMaterial` and `setPixelRatio` checked in three 0.186.1.
- 2026-10-25: LOD switching by projected size with the 2-pixel rule (CGPP 3e §25.4, round 2 books track); `LOD.addLevel` hysteresis checked in three 0.186.1.
- 2026-11-22: effect culling by projected size, origin rebase pointer, half-resolution fog with measured costs and the empty-space-skip caveat (harvest of a Reddit post on an underwater sandbox's far-field culling; numbers re-measured here, not taken from the post). `PassNode.setResolutionScale`, `GodraysNode.resolutionScale`, `BilateralBlurNode` and `VolumeNodeMaterial.steps` checked in three 0.186.1.
