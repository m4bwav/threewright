---
title: Performance budgets and techniques
slug: performance
kind: topic
summary: Draw call and triangle budgets by target device, instancing and batching, and the measurements that catch a slow scene in text.
tags: [performance, draw calls, instancedmesh, batchedmesh, budget, pixel ratio, lod]
applies_to: ">=r183"
status: current
renderer: both
last_verified: 2026-09-26
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
- Assuming WebGPURenderer is a free performance upgrade: for CPU-bound scenes with many unique draws it can be several times slower to first render than WebGLRenderer on the same hardware. See `renderer-choice`.

## Verify

- `tw check <page>` prints draw calls and triangle counts in its scene summary and flags "slow or janky" territory (draw calls over about 100 on phones or 1000 anywhere; triangles in the millions) with a fix hint pointing at instancing.
- `tw check <page> --eval "renderer.info.render.calls"` (or `renderer.info.render.drawCalls` on WebGPU, where `render.calls` counts `render()` calls since start) gives the exact number to compare against the budget table.
- `tw perf <page> --seconds 5` prints frame time p50, p95, p99 and max, frames over 33 ms, draw calls and triangles per frame, and geometry, texture and heap growth. Add `--cpu-throttle 4` for a slow-device estimate. Headless numbers are uncalibrated: compare runs on one machine, do not quote them as device fps. Headless Chrome with a GPU ran at a 60 fps vsync cap on 2026-09-26, so look at p95, p99 and max rather than fps.
- `tw check <page> --save before.json`, change the code, then `tw check <page> --against before.json` lists what moved: draw calls, triangles, geometries, textures, object types, new or gone problems, and the share and region of the frame that changed.
- `tw scene <page>` collapses repeated siblings (`Mesh x240 'bolt'`), which is the fastest way to spot "this should be an InstancedMesh" in text before touching a screenshot.

## Notes

- 2026-09-26: written from the games research (sections 2.1, 3) and the scenarios research (section B5), with the WebGPU-versus-WebGL performance numbers from the direction research (section 3.5, three.js issues 30560, 31055, 33821).
