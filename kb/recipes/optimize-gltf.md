---
title: Optimize a glTF
slug: optimize-gltf
kind: recipe
summary: The gltf-transform pipeline order (dedupe, weld, simplify, resize, compress textures, compress geometry) and how to confirm it worked with tw glb.
tags: [gltf-transform, optimize, draco, ktx2, meshopt, pipeline]
applies_to: r186
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-scenarios-xr-and-testing.md, ai-docs/research/2026-09-26-games.md]
related: [loaders-and-assets, load-gltf-with-decoders, export-glb]
---

# Optimize a glTF

## Goal

Take a raw exported GLB (often tens of MB, uncompressed textures, duplicate geometry) down to a web-ready size, in a fixed order that avoids doing expensive work twice or in the wrong sequence. `@gltf-transform/cli` 4.5.0 is the workhorse for this; `tw glb` reports the before/after numbers.

## Code

```sh
# 1. Inspect first: know what you are optimizing before you touch it.
npx @gltf-transform/cli inspect model.glb

# 2. Dedupe and prune: remove duplicate accessors/materials/textures and unused data.
npx @gltf-transform/cli dedup model.glb model.tmp.glb
npx @gltf-transform/cli prune model.tmp.glb model.tmp.glb

# 3. Weld and simplify, only if triangle count is over budget (see the performance topic).
npx @gltf-transform/cli weld model.tmp.glb model.tmp.glb
npx @gltf-transform/cli simplify model.tmp.glb model.tmp.glb --ratio 0.5 --error 0.01

# 4. Resize textures to a web-reasonable cap (2048px is a common ceiling; see performance).
npx @gltf-transform/cli resize model.tmp.glb model.tmp.glb --width 2048 --height 2048

# 5. Compress textures: KTX2 with ETC1S for color maps, UASTC for normal maps
#    (UASTC keeps more precision, which normal maps need; ETC1S compresses further).
npx @gltf-transform/cli etc1s model.tmp.glb model.tmp.glb --slots "map,emissiveMap"
npx @gltf-transform/cli uastc model.tmp.glb model.tmp.glb --slots "normalMap"

# 6. Compress geometry: meshopt (fast to decode, good default) or Draco (smaller, slower to decode).
npx @gltf-transform/cli meshopt model.tmp.glb model.optimized.glb

# 7. Validate and inspect the result.
npx @gltf-transform/cli validate model.optimized.glb
npx @gltf-transform/cli inspect model.optimized.glb
```

`@gltf-transform/cli` also ships an `optimize` command that runs a sensible default sequence of the steps above in one call (`npx @gltf-transform/cli optimize model.glb model.optimized.glb --texture-compress ktx2 --compress meshopt`); use the step-by-step form above when a specific step needs different settings (a normal map that must stay UASTC while color maps go ETC1S, for instance) than the defaults would pick. Wire the matching decoders into the loader afterward; see `load-gltf-with-decoders`.

## Verify

- `tw glb model.glb` and `tw glb model.optimized.glb` side by side: compare size, draw calls, triangles, texture pixel dimensions and any budget warnings. The optimized file should be smaller with the same (or an intentionally reduced) visual content, and its budget warnings should be fewer or none.
- `npx @gltf-transform/cli validate model.optimized.glb` should report no errors; treat any Khronos validator error as a real problem to fix before shipping, not noise.
- Load the optimized file in a page and run `tw check <page>`: a wired decoder for a compression format the file no longer uses is harmless but wasted; a missing decoder for one it does use throws a specific, actionable error (see `load-gltf-with-decoders`).

## Notes

- 2026-09-26: written from the scenarios research (section B5, glTF Transform CLI 4.5.0) and the games research (section 4.2, the recommended step order for a game asset pipeline). The exact CLI commands were not run against a real asset in this pass; verify flag names with `npx @gltf-transform/cli help <command>` against the installed 4.5.0 before relying on them in a script, since the research notes flag some flags (for example `inspect --format`) as unverified for their exact values.
