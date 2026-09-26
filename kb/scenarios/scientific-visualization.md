---
title: Scientific and medical visualization
slug: scientific-visualization
kind: scenario
summary: Volume raymarching with Data3DTexture, point-cloud viewers (Potree), and molecular viewers (Mol*, 3Dmol.js) that mostly are not three.js; know when to hand off.
tags: [volume rendering, point cloud, potree, molstar, molecular visualization, raymarching, medical]
applies_to: ">=r167"
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-scenarios-xr-and-testing.md]
related: [3d-chart-in-docs, tsl, performance, when-3d-is-justified]
template: html-webgpu
---

# Scientific and medical visualization

## When

- A scalar or vector field over a 3D grid needs volume rendering (medical imaging, CFD, density fields): raymarching a `Data3DTexture` with a transfer function.
- Molecular structures need a web viewer: this is usually a job for a specialist tool (Mol*, 3Dmol.js), not hand-rolled three.js, unless the goal is custom molecular art.
- A massive point cloud (lidar scans, photogrammetry) needs to stream and render progressively: Potree, not a naive `THREE.Points` load of the whole file.

## Stack

| need | first choice | when to hand-roll in three.js |
|---|---|---|
| volume rendering | `Data3DTexture` plus a raymarching shader (`webgl2_materials_texture3d` for WebGL2, a WebGPU volume node material for the WebGPU path) | custom transfer functions, integration with a larger scene |
| clinical-grade neuroimaging | NiiVue (WebGL2, not three.js; specialist tool) | rarely; use the specialist tool |
| molecular viewers | Mol* (the reference web viewer, its own WebGL renderer) or 3Dmol.js (lighter, forked from GLmol) | custom molecular art: instanced spheres and cylinders, or impostor sphere shaders, in three.js |
| massive point clouds | Potree 1.8 (WebGL, three.js-based) via `potree-core` or `pnext/three-loader`; watch Potree-Next (WebGPU rewrite, not yet mature) | small to medium clouds that fit in memory as a single `THREE.Points` |

- Renderer choice depends on the sub-task: volume raymarching and point clouds can use either renderer (`both`); molecular viewers (Mol*, 3Dmol.js) manage their own WebGL context independent of three.js entirely.

## Build

- No dedicated template exists for this scenario; volume rendering fits `tw new html-webgpu <dir>` (TSL node material path) or `tw new html-importmap <dir>` (WebGL2 raymarching shader). For a molecular or point-cloud viewer, integrate the specialist tool's own embed rather than building the renderer from scratch.
- Use 16-bit or float 3D textures with a transfer function stored in a 1D lookup texture; apply early ray termination and empty-space skipping to keep raymarching fast.
- For point clouds, stream with Potree's LOD system rather than loading a full uncompressed cloud; the rising Cloud Optimized Point Cloud (COPC) format is the streaming format to watch.
- For custom molecular art in three.js (not a full Mol*/3Dmol.js viewer), use instanced spheres and cylinders for atoms and bonds, or impostor sphere shaders for large counts.

## Pitfalls

- Float precision in scanner or lidar coordinates: rebase to a local origin the same way the geospatial scenario does, or vertices jitter visibly during camera movement.
- Point-size attenuation defaults can make a point cloud look wrong at a distance (too large or too small); tune it against the actual point density and viewing distance, not a default.
- Uncompressed volumes blow memory fast; 16-bit textures and empty-space skipping are not optional polish, they are what keeps a volume renderer usable at all on a mid-range GPU.
- Treating Mol* or 3Dmol.js as "just another three.js library" is a mistake: they run their own WebGL renderer and do not share a scene graph or camera with a surrounding three.js page.

## Verify

- `tw check <page>` is `result: OK` for the three.js-based parts (volume raymarching, point-cloud viewer, custom molecular art); a specialist tool embed (Mol*, 3Dmol.js) is verified through its own load-success signal, not through tw's three.js-specific checks.
- `tw shot <page> --size 960x540` for a visual check of the transfer function or point-cloud density; confirm the visualization is not either fully transparent (wrong transfer function range) or a solid block (no early ray termination).

## Notes

- 2026-09-26: written from the 2026-09-26 research (scenarios-xr-and-testing A6). NiiVue's 2026 status, Potree-Next's maturity, and the exact WebGPU volume node material name were not independently confirmed and are flagged unverified in the source research.
