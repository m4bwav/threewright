---
title: Spark
kind: library
slug: spark
summary: The most capable three.js Gaussian-splat engine, with streaming LoD and a GPU virtual memory pool; WebGL2 only in official releases, versus r186's native WebGPU splat renderer.
tags: [spark, gaussian splats, splatting, lod, streaming, radiance fields]
applies_to: ">=r180"
status: current
renderer: webgl
last_verified: 2026-09-26
sources: [https://github.com/sparkjsdev/spark, https://www.worldlabs.ai/blog/spark-2.0, ai-docs/research/2026-09-26-ecosystem-libraries.md, ai-docs/research/2026-09-26-scenarios-xr-and-testing.md]
related: [splat-scenes, gaussian-splats]
package: "@sparkjsdev/spark"
version_checked: "2.2.0"
---

# Spark

## Use it for

- Large or streamed Gaussian-splat scenes: Spark 2.0's continuous LoD (splat budgets from 500k to 2.5M), progressive coarse-to-fine streaming, a 16M-splat GPU virtual memory pool with LRU paging, and the .RAD streaming format.
- Cross-device splat viewing on WebGL2: desktop, iOS, Android and Quest, with the heavy lifting (Rust compiled to WASM) run in the background.
- Any scene where splats must mix with a broader three.js `WebGLRenderer` scene rather than sit in an isolated viewer.

## Avoid it when

- The scene is small to medium and must run on `WebGPURenderer` with TSL post-processing or OIT: three r186's own native splat renderer (`three/addons/objects/GaussianSplat.js`) targets that path; Spark's official releases are WebGL2 only (a community WebGPU fork exists but is unverified).
- `GaussianSplats3D` assets or workflow are already in place: its README itself says it is no longer developed and points to Spark, so migrate rather than start new work on it.

## Setup

Versions checked 2026-09-26: `@sparkjsdev/spark` 2.2.0 (2026-09-11), peer `three >=0.180.0`. 2.0 shipped 2026-04-14 with the LoD and streaming features above.

```sh
npm install @sparkjsdev/spark@2.2.0
```

```js
import { SplatMesh } from '@sparkjsdev/spark';

const splat = new SplatMesh({ url: 'scene.spz' });
await splat.initialized;
scene.add(splat);
```

## Pitfalls

- Sorting cost scales with visible splat count; budget per device (mobile roughly 0.5 to 1M visible splats, desktop 2 to 3M, derived from Spark's own LoD budgets) rather than loading the full asset everywhere.
- Splat transparency does not compose well with ordinary mesh transparency in the same scene; keep splats and transparent meshes in separate passes or accept visible sorting artifacts at their boundary.
- Lighting is baked into the splat data; you cannot relight a splat scene the way you would a lit mesh, so do not add scene lights expecting them to affect splats.
- Uses GLSL `ShaderMaterial`/`RawShaderMaterial` under WebGL2; it does not run under `WebGPURenderer`'s native TSL path even though three r186 also has a native splat renderer, so pick one splat system per scene rather than mixing them.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries, scenarios-xr-and-testing).
