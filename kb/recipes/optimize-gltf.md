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
#    --slots is a glob over glTF slot names, not three.js material properties.
#    Both commands need KTX-Software (ktx, toktx) on PATH.
npx @gltf-transform/cli etc1s model.tmp.glb model.tmp.glb --slots "{baseColorTexture,emissiveTexture}"
npx @gltf-transform/cli uastc model.tmp.glb model.tmp.glb --slots "normalTexture"

# 6. Compress geometry: meshopt (fast to decode, good default) or Draco (smaller, slower to decode).
npx @gltf-transform/cli meshopt model.tmp.glb model.optimized.glb

# 7. Validate and inspect the result.
npx @gltf-transform/cli validate model.optimized.glb
npx @gltf-transform/cli inspect model.optimized.glb
```

`@gltf-transform/cli` also ships an `optimize` command that runs a sensible default sequence of the steps above in one call (`npx @gltf-transform/cli optimize model.glb model.optimized.glb --texture-compress ktx2 --compress meshopt`); use the step-by-step form above when a specific step needs different settings (a normal map that must stay UASTC while color maps go ETC1S, for instance) than the defaults would pick. Wire the matching decoders into the loader afterward; see `load-gltf-with-decoders`.

## Verify

- `tw glb model.glb` and `tw glb model.optimized.glb` side by side: compare size, draw calls, triangles, texture pixel dimensions and budget warnings. The optimized file should be smaller with the same (or an intentionally reduced) visual content, and have fewer or no budget warnings. The `bounds` line is right for `KHR_mesh_quantization` files too (normalized positions are dequantized since the fix of 2026-09-26).
- `npx @gltf-transform/cli validate model.optimized.glb` should report `No errors found`. It lists `UNSUPPORTED_EXTENSION` for `KHR_texture_basisu` and marks the KTX2 images unused; both are infos, since the validator cannot read that extension.
- Run `etc1s` and `uastc` with `-v` once: each texture prints its slots (`Slots → [baseColorTexture]`) and whether it was compressed or `excluded by "slots" parameter`. A size that does not change means the glob matched nothing.
- Load the optimized file in a page and run `tw check <page>`: a missing decoder for a format the file uses throws a specific error (see `load-gltf-with-decoders`).
- Verified 2026-09-26 on Windows 11 with `@gltf-transform/cli` 4.5.0 (`npx @gltf-transform/cli --version` and `npm view @gltf-transform/cli version`) and KTX-Software 4.4.2 on PATH (`ktx` and `toktx`). Source: a 308 KB GLB exported with GLTFExporter (3 meshes, 4,110 triangles, 3 PNG textures, largest 3000 px). Every command above ran with exit code 0: dedup 315.77 KB to 314.8 KB, prune to 296.88 KB, weld to 293.4 KB, simplify to 256.53 KB, resize to 225.02 KB, etc1s to 118.12 KB, uastc to 90.7 KB, meshopt to 65.73 KB. `tw glb model.optimized.glb`: `64 KB · triangles 2,062 · images 3 (ktx2 3; 49 KB; largest 2048 px)`, `needs:` MeshoptDecoder and KTX2Loader, no budget warnings besides a wrong bounds warning that tw has since fixed (see Notes). `validate`: `No errors found`. The `optimize` one-liner gave 75.24 KB (etc1s on all three textures, meshopt). The files loaded and rendered in the `load-gltf-with-decoders` harness.

## Notes

- 2026-09-26: written from the scenarios research (section B5, glTF Transform CLI 4.5.0) and the games research (section 4.2, the recommended step order for a game asset pipeline). The exact CLI commands were not run against a real asset in this pass; verify flag names with `npx @gltf-transform/cli help <command>` against the installed 4.5.0 before relying on them in a script, since the research notes flag some flags (for example `inspect --format`) as unverified for their exact values.
- 2026-09-26: ran every command against a generated model (see Verify). Fixed the texture slots: `--slots` is a glob over glTF slot names (`baseColorTexture`, `emissiveTexture`, `normalTexture`), not three.js material properties. With `"map,emissiveMap"` and `"normalMap"` both commands skipped every texture and the file size did not change. All other flags are right for 4.5.0. `etc1s`, `uastc` and `optimize --texture-compress ktx2` need KTX-Software on PATH; the Windows installer can be unpacked with 7-Zip instead of installed.
- 2026-09-26: tw glb reported quantized models tens of thousands of units across: min and max of a normalized accessor are raw integers and were not divided by 32767 (int16) or 127 (int8). Fixed; checked on gltf-transform quantize and meshopt output (0.095 x 0.177 x 0.117, same as the source) and gltfpack output.
- 2026-09-26: KTX-Software 4.4.2 is now installed per user on the Windows test machine (%LOCALAPPDATA%/Programs/KTX-Software/bin on the user PATH; the signed NSIS installer takes /S /D=<dir> and needs no admin). etc1s on baseColorTexture and uastc on normalTexture ran on a generated 512 px textured quad: 13.25 KB to 9.27 KB, validate clean, tw glb shows ktx2 2.
