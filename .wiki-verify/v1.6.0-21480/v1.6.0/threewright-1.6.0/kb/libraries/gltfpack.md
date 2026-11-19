---
title: gltfpack
kind: library
slug: gltfpack
summary: One-shot CLI GLB compressor built on meshoptimizer; writes Meshopt-compressed glTF that three r186's loader reads natively.
tags: [gltf, glb, compression, meshopt, cli, tangents, normals]
applies_to: any
status: current
renderer: none
last_verified: 2026-09-26
sources: [https://github.com/zeux/meshoptimizer, ai-docs/research/2026-09-26-ecosystem-libraries.md]
related: [gltf-transform, optimize-gltf, export-glb]
package: "gltfpack"
version_checked: "1.3.0"
---

# gltfpack

## Use it for

- A fast, single command to compress a GLB with Meshopt: `gltfpack -i in.glb -o out.glb -ce khr` writes `KHR_meshopt_compression`, which three r186's `GLTFLoader` reads directly.
- Quick tangent (`-gt`) or normal (`-gn`) generation on export when the source asset lacks them.
- Build steps and CI where a scripted, dependency-light single binary is preferable to a Node pipeline.

## Avoid it when

- The task needs inspection, validation, extension editing, or several chained operations (join, instance, simplify, palette): glTF Transform's CLI covers all of that in one tool; gltfpack is compression-focused.
- The asset must keep or add `KHR_gaussian_splatting` or other extensions gltfpack does not understand; check what it strips by diffing `gltf-transform inspect` before and after.

## Setup

Versions checked 2026-09-26: `gltfpack` 1.3.0 (2026-09-25). `-gt` (tangents) landed in 1.2, `-gn` (normal generation) in 1.3. The `npx` lines name the version so they run 1.3.0 with or without the local install (checked 2026-10-03: `-ce khr` packed a 245 KB GLB to 57 KB).

```sh
npm install -D gltfpack@1.3.0
```

```sh
npx gltfpack@1.3.0 -i model.glb -o model.packed.glb -ce khr   # Meshopt compression, three r186 reads it natively
npx gltfpack@1.3.0 -i model.glb -o model.packed.glb -ce khr -gt -gn   # also generate tangents and normals
```

## Pitfalls

- `-ce khr` writes `KHR_meshopt_compression`; older three.js versions (pre-r186's decoder update) or other viewers may not read it. Check the target's `GLTFLoader`/`MeshoptDecoder` version before shipping if the asset targets more than one renderer.
- gltfpack does not validate the output against the glTF schema; run `gltf-transform validate` (or the Khronos `gltf-validator`) after packing if the asset goes to a pipeline that is strict about spec conformance.
- It operates on one file at a time with no built-in batching; wrap it in a shell loop or a small script for a whole asset directory.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries).
