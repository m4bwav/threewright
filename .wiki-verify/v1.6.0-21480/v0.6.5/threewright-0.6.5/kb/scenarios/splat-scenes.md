---
title: Gaussian splat scenes
slug: splat-scenes
kind: scenario
summary: Split by scene size: three r186's native WebGPU splat renderer for small to medium scenes, Spark on WebGL2 for large or streamed ones; KHR_gaussian_splatting is now ratified.
tags: [gaussian splats, splatting, spark, khr_gaussian_splatting, radiance fields, sog, spz, webgpu]
applies_to: "r186"
status: current
renderer: webgpu
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-scenarios-xr-and-testing.md, ai-docs/research/2026-09-26-direction.md]
related: [spark, gaussian-splats, renderer-choice, webgpu-backend-check]
template: html-webgpu
---

# Gaussian splat scenes

## When

- A capture (a photogrammetry-style scan, a NeRF/3DGS training run) needs to render in a browser as a Gaussian splat, not converted to a polygon mesh.
- Splats are now a standard asset type: `KHR_gaussian_splatting` is ratified by Khronos, and three r186 ships a native TSL splat renderer and loader in the addons.
- Not for a scene that needs to relight the captured geometry: splats bake lighting in at capture time and cannot be relit like a lit mesh.

## Stack

| scene size | renderer | engine |
|---|---|---|
| small to medium | `WebGPURenderer` | three r186's native splat renderer (`three/addons/objects/GaussianSplat.js`), loaders for PLY, SPLAT, SPZ, KSPLAT and glTF |
| large or streamed | `WebGL2` (via `WebGPURenderer`'s fallback, or plain `WebGLRenderer`) | Spark 2.x: continuous LoD, progressive streaming, a GPU virtual-memory pool with LRU paging, the .RAD format |

- Split the choice by scene size, per the direction research's renderer table: three's native addon is "a minimal renderer" with a GPU counting sort and no LoD or streaming code in r186; Spark has LoD streaming and paging built in but stays on WebGL2 in official releases (a community WebGPU fork exists but is unverified). Revisit this split once Spark ships official WebGPU support.
- `GaussianSplats3D` (mkkellogg) is deprecated by its own README, which recommends Spark; do not start new work on it.

## Build

- Native r186 path: `tw new splats <dir>` copies a verified viewer (`SPLATLoader`, `GaussianSplat`, load and error states, backend readout). Swap `scene.splat` for your capture. It was checked on the real WebGPU backend and on the WebGL 2 fallback on 2026-09-26.
- Spark path: no template yet. Start from `tw new html-importmap <dir>` and add `@sparkjsdev/spark`.
- Format choice on delivery: `.ply` is raw and huge (avoid shipping it to end users); `.spz` (Niantic, ZSTD-compressed, about 10x smaller than PLY) is the current default delivery format; `.sog` (PlayCanvas, WebP-based, 15 to 20x smaller than PLY, with a streamed LoD variant) is worth using when the `playcanvas/splat-transform` tool fits the pipeline; `.rad` is Spark 2.0's own streaming format; glTF with `KHR_gaussian_splatting` fits a pipeline that mixes meshes and splats in one asset.
- Budget visible splats per device: roughly 0.5 to 1M on mobile, 2 to 3M on desktop (derived from Spark's own LoD budgets; treat as guidance, not a hard spec).
- Sorting cost scales with splat count regardless of engine; a scene that looks fine at a fixed camera angle can still be slow once the viewer starts orbiting and the sort has to re-run continuously.

## Pitfalls

- Splat transparency does not compose well with ordinary mesh transparency; keep splats and transparent meshes in separate render concerns rather than expecting correct sorting across both.
- Splats cannot be relit; do not add scene lights expecting them to affect a baked splat capture, and do not promise a client that lighting can be adjusted after the fact.
- Mixing three's native splat renderer and Spark in the same scene is not a supported pattern; pick one splat engine per scene.
- Large `.ply` downloads shipped directly to a browser are the most common way a "gaussian splat demo" becomes unusably slow to load; convert to `.spz` or `.sog` before shipping, not after a user complains.

## Verify

- `tw check <page>` is `result: OK`; log `renderer.backend.isWebGPUBackend` once at startup so a silent WebGL2 fallback on the native-renderer path is visible in the check output.
- `tw shot <page> --size 960x540` for a framing and density check; confirm the splat cloud is not obviously sparse (undersampled) or a solid blob (oversaturated point size) at the chosen camera distance.
- File-size check on the delivered asset (`.spz`/`.sog`, not `.ply`) before calling the asset pipeline done; a raw PLY left in the shipped bundle is a common oversight.
- This container's WebGPU backend fails on Chromium 141 (a texture-view swizzle issue) for the native renderer path; verify the native-renderer claims on a current real Chrome, not only on this container's fallback.

## Notes

- 2026-09-26: written from the 2026-09-26 research (scenarios-xr-and-testing A5, direction section 4.1). Spark's official WebGPU support, KHR_gaussian_splatting's compression companion extensions, and which delivery format wins are all flagged as likely to change.
- 2026-09-26: the `splats` template now exists and is verified on WebGPU (Chrome 153, RTX 5060 Ti) and on the WebGL 2 fallback.
