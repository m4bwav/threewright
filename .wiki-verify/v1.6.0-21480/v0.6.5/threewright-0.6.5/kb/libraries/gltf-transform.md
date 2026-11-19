---
title: glTF Transform
kind: library
slug: gltf-transform
summary: Scripted and CLI glTF optimization (Meshopt, Draco, KTX2, simplification, joining); the default asset pipeline for every scenario that ships a GLB.
tags: [gltf, glb, optimize, meshopt, draco, ktx2, pipeline, cli, agent tooling]
applies_to: any
status: current
renderer: none
last_verified: 2026-09-26
sources: [https://gltf-transform.dev/, https://github.com/donmccurdy/glTF-Transform, ai-docs/research/2026-09-26-ecosystem-libraries.md, ai-docs/research/2026-09-26-games.md]
related: [loaders-and-assets, optimize-gltf, export-glb, gltfpack, product-viewer, games]
package: "@gltf-transform/cli"
version_checked: "4.5.0"
---

# glTF Transform

## Use it for

- Scripted glTF optimization in Node or the browser (`@gltf-transform/core`, `/functions`, `/extensions`) when a project needs the pipeline as code, not just a one-shot CLI call.
- The CLI (`gltf-transform optimize`, `inspect`, `validate`) as the default agent workflow for compressing, inspecting and validating a GLB before shipping it, in any scenario (product viewer, games, avatars).
- Editing extension data such as `KHR_materials_variants` programmatically (its `KHRMaterialsVariants` class) rather than by hand.

## Avoid it when

- A single quick compression pass with no scripting is all that is needed and `gltfpack` is already in the toolchain: `gltfpack` is faster for that one job. Reach for glTF Transform when you need `inspect`/`validate` reports, extension editing, or a Node pipeline.
- The asset uses `KHR_meshopt_compression` or `KHR_gaussian_splatting` and the pipeline must round-trip those extensions: the 4.5.0 CLI bundle does not handle either (inferred from its build), so verify with `inspect` after any pass that touches such a file.

## Setup

Versions checked 2026-09-26: `@gltf-transform/core`, `/functions`, `/extensions` and `/cli` all 4.5.0 (2026-09-01). KTX2 output needs the `ktx` binary from KTX-Software 4.4.0 or later on `PATH`.

```sh
npm install -D @gltf-transform/cli@4.5.0
```

```sh
gltf-transform inspect model.glb
gltf-transform validate model.glb
gltf-transform optimize model.glb model.optimized.glb \
  --compress meshopt --texture-compress ktx2 --texture-size 1024
```

Games and level assets benefit from more flags together:

```sh
gltf-transform optimize level.glb level.opt.glb \
  --join --flatten --instance --simplify --simplify-ratio 0.6 --palette --prune
```

Without the `ktx` binary installed, fall back to WebP:

```sh
gltf-transform optimize model.glb model.opt.glb --texture-compress webp
```

## Pitfalls

- `gltf-transform optimize` silently produces no KTX2 output (or errors, depending on version) when the `ktx` binary is missing; run `ktx --version` first, or use `--texture-compress webp` as a fallback that needs no external binary.
- Never paste a GLB's contents into context to inspect it; `gltf-transform inspect` gives a text table of scenes, meshes, materials, textures, animations and sizes that answers almost every question a binary dump would.
- `--join` needs `--flatten` first to merge transforms before merging geometry, and `--instance` only helps when meshes are truly repeated (same geometry reference), not merely visually similar.
- The 4.5.0 CLI bundle has no confirmed support for `KHR_meshopt_compression` or `KHR_gaussian_splatting`; check the extension list in the output with `inspect` rather than assuming a round trip preserved them.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries, games).
