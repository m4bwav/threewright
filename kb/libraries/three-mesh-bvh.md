---
title: three-mesh-bvh
kind: library
slug: three-mesh-bvh
summary: Fast raycasts, shapecasts and BVH-based capsule collision against level meshes; 0.9.15 adds a WebGPU TSL/WGSL compute path alongside the pure-JS one.
tags: [bvh, raycasting, collision, character controller, path tracing, csg, webgpu]
applies_to: ">=r159"
status: current
renderer: both
last_verified: 2026-09-26
sources: [https://github.com/gkjohnson/three-mesh-bvh, https://github.com/gkjohnson/three-mesh-bvh/blob/master/WEBGPU_API.md, ai-docs/research/2026-09-26-ecosystem-libraries.md, ai-docs/research/2026-09-26-games.md]
related: [rapier, games, raycasting-and-picking, performance]
package: "three-mesh-bvh"
version_checked: "0.9.15"
---

# three-mesh-bvh

## Use it for

- Fast raycasting against large or complex meshes (thousands of triangles): building a `MeshBVH` once and raycasting against it is far faster than the default triangle-by-triangle raycast.
- Capsule- or sphere-against-level-mesh collision for a character walking on static geometry with no dynamic bodies (`example/characterMovement.js`), when a full physics engine is more than the scene needs.
- Backing library for `three-bvh-csg` (boolean mesh operations) and `three-gpu-pathtracer` (BVH traversal for path tracing).

## Avoid it when

- The scene needs dynamic rigid bodies, joints or a character controller with gravity and slopes: use Rapier or Jolt. three-mesh-bvh is a spatial index, not a physics engine.
- The mesh changes every frame (skinned or morphed geometry without a refit step): rebuilding a BVH per frame can cost more than it saves; refit instead of rebuild when the topology is stable.

## Setup

Versions checked 2026-09-26: `three-mesh-bvh` 0.9.15 (2026-09-09), peer `three >=0.159.0`. drei 10 depends on `three-mesh-bvh ^0.8.3`; installing 0.9.x directly in a drei project gives two copies unless you dedupe.

```sh
npm install three-mesh-bvh@0.9.15
```

```js
import * as THREE from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';

THREE.Mesh.prototype.raycast = acceleratedRaycast;
mesh.geometry.boundsTree = new MeshBVH(mesh.geometry);
// raycaster.intersectObject(mesh) now uses the BVH automatically
```

WebGPU (TSL) compute raycasts and shapecasts:

```js
import { bvhRayFn, bvhClosestPointFn } from 'three-mesh-bvh/webgpu';
```

## Pitfalls

- `acceleratedRaycast` must be assigned to `THREE.Mesh.prototype.raycast` (or per-instance) before any raycast happens, and `boundsTree` must be built after the geometry's final vertex positions are set; changing geometry afterward without rebuilding leaves stale bounds.
- The character-movement example in the repo still uses `THREE.Clock` and a fixed 5-substep, 0.1 s-clamped loop; port the substep and clamp idea but replace `Clock` with `THREE.Timer` for new code (Clock is deprecated since r183).
- Two copies of `three-mesh-bvh` (one from drei, one installed directly) can register `acceleratedRaycast` from different module instances; check `npm ls three-mesh-bvh` if raycasts behave inconsistently.
- The `/webgpu` entry needs three r186's WebGPURenderer or its WebGL 2 fallback; it is a different API surface (TSL functions) from the pure-JS `MeshBVH` class, not a drop-in replacement.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries, games).
