---
title: Gaussian splats
slug: gaussian-splats
kind: topic
summary: The native r186 splat renderer versus Spark, splat file formats, and which one to reach for by scene size.
tags: [gaussian splat, spark, ply, spz, ksplat, splat, radiance fields]
applies_to: r186
status: current
renderer: webgpu
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-scenarios-xr-and-testing.md, ai-docs/research/2026-09-26-direction.md, ai-docs/research/2026-09-26-core-r160-r186.md]
related: [renderer-choice, loaders-and-assets, performance]
---

# Gaussian splats

## Essentials

- Gaussian splats became a standard web asset type in 2026. `KHR_gaussian_splatting` is now "Complete, Ratified by the Khronos Group" (spec README, checked 2026-09-26); compression is left to companion extensions.
- Three.js r186 ships a native splat renderer and loaders in the addons (not the core build): `import { GaussianSplat } from 'three/addons/objects/GaussianSplat.js'` (extends `Mesh`), with loaders `GaussianSplatPLYLoader`, `SPLATLoader`, `SPZLoader`, `KSPLATLoader` under `three/addons/loaders/`, and `GLTFGaussianSplatLoaderExtension` for glTF files that embed splats. It has spherical harmonics, frustum culling, raycasting and a GPU counting sort, but it "can only be used with WebGPURenderer" — the `forceWebGL` fallback works, plain `WebGLRenderer` does not. It calls itself "a minimal renderer" and ships no level-of-detail or streaming in r186; the page's import map needs `three/webgpu` and `three/tsl` in addition to `three/addons/`.
- Spark (`sparkjsdev/spark`, World Labs) remains the most capable three.js splat engine for large or streamed scenes. Spark 2.x adds continuous level-of-detail with splat budgets of 500k-2.5M, progressive coarse-to-fine streaming, a large GPU virtual-memory pool with LRU paging, and its own `.RAD` streaming format. It runs on WebGL 2 (desktop, iOS, Android, Quest); a community WebGPU fork exists but official releases stay WebGL-only as of the date checked. `GaussianSplats3D` (mkkellogg), an older popular splat library, says in its own README that it is no longer in active development and points users at Spark.
- File formats, smallest to largest in practice: `.spz` (Niantic, ZSTD-compressed quantized attributes, roughly 10x smaller than raw PLY, described as the "betting favourite" delivery format), `.sog` (PlayCanvas Spatially Ordered Gaussians, WebP-based, roughly 15-20x smaller than PLY, with a streamed LoD variant; tooling: `playcanvas/splat-transform` CLI and the SuperSplat editor), `.ksplat` (GaussianSplats3D's own format), `.splat` (an older compact format with no spherical harmonics), `.ply` (raw training output, by far the largest), `.rad` (Spark's own streaming format), and glTF with `KHR_gaussian_splatting` for pipelines that need to mix ordinary meshes and splats in one file.
- Choose by scene size, mirroring the `renderer-choice` decision table: Spark on `WebGLRenderer` for large or streamed scenes (it has LoD, paging and a real streaming format, and runs everywhere WebGL 2 does); the r186 native `GaussianSplat` on `WebGPURenderer` for small to medium scenes, or when the splat needs to sit alongside TSL materials, order-independent transparency or other node post-processing that only exists on that renderer.
- Budgets (derived from Spark's own budgets; treat as guidance, not a hard spec): roughly 0.5-1M visible splats on mobile, 2-3M on desktop. Sort cost scales with splat count, so budget per target device rather than per scene.

## Pitfalls

- Trying to render `GaussianSplat` with a plain `WebGLRenderer`: it is WebGPU-only (with the WebGL 2 fallback of `WebGPURenderer` as the one exception); a bare WebGL renderer simply cannot construct one.
- Forgetting `three/webgpu` and `three/tsl` in the import map on a splat page: the same gap the `tsl` and `webgpu-support` topics describe, since the splat renderer is built on the TSL/WebGPU stack.
- Choosing the r186 native renderer for a large scene expecting LoD or streaming: it has neither in r186 ("a minimal renderer"); a big scene will load and sort every splat at once. Reach for Spark instead.
- Downloading raw `.ply` files for web delivery: they are far larger than `.spz` or `.sog` for the same visual result, with no compression benefit for the extra bytes.
- Compositing splat transparency with ordinary mesh transparency and expecting correct sorting: splat transparency does not compose well with mesh transparency by default; treat splats and transparent meshes as separate concerns rather than assuming standard alpha blending order will look right.
- Expecting lighting changes to affect a baked splat capture: splats bake lighting into their color data at capture time, so runtime lights in the scene do not relight them.

## Verify

- `tw check <page>` reports the renderer/backend line; confirm it says `WebGPURenderer (WebGPU backend)` (or the WebGL 2 fallback deliberately, if that is the intent) before assuming a splat page is running the code path you think it is.
- `tw glb` does not read splat formats; use file size on disk plus the splat count your loader reports (most splat loaders expose a count after load) as the text-first check on scene weight, rather than a screenshot.
- A visual check (`tw shot` or `tw sheet`) is appropriate once the load succeeded in text, since splat quality and artifacting are inherently visual questions.

## Notes

- 2026-09-26: written from the scenarios research (section A5) and the direction research (section 4.1), with the r186 addon paths and class names checked against `node_modules/three/examples/jsm/objects/GaussianSplat.js` and `examples/jsm/loaders/` in the installed 0.186.1.
