---
title: Loaders and asset formats
slug: loaders-and-assets
kind: topic
summary: Which loader to use for a format in r186, current names for renamed HDR and text loaders, and the decoders glTF needs.
tags: [loader, gltf, draco, ktx2, meshopt, hdr, gltfloader, decoder]
applies_to: ">=r180"
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-core-r160-r186.md, ai-docs/research/2026-09-26-games.md]
related: [load-gltf-with-decoders, optimize-gltf, export-glb, gaussian-splats]
template: html-importmap
---

# Loaders and asset formats

## Essentials

- glTF/GLB is the default model format on the web: `GLTFLoader` from `three/addons/loaders/GLTFLoader.js`. It tags base color and emissive textures `SRGBColorSpace` itself, so you do not need to set `colorSpace` on textures it loads.
- A compressed or optimized GLB needs its decoder wired into the loader before `load()`:
  - Draco geometry: `DRACOLoader` from `three/addons/loaders/DRACOLoader.js`. Since r185 its default decoder URLs resolve next to the module, so `setDecoderPath()` is optional when `three/addons/libs/draco/` is actually served; set it explicitly when it is not. `setDecoderConfig()` is deprecated since r185 (removal planned r194): the loader always uses WASM now, so drop the call.
  - KTX2 textures: `KTX2Loader` from `three/addons/loaders/KTX2Loader.js`. Still needs `setTranscoderPath('<addons>/libs/basis/')` and `detectSupport(renderer)` after `await renderer.init()` (the async form, `detectSupportAsync()`, is deprecated since r181).
  - Meshopt-compressed geometry: `import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'`, then `gltfLoader.setMeshoptDecoder(MeshoptDecoder)`.
  - `tw glb <file.glb>` names exactly which decoders a given file needs; wire only those, since wiring an unused decoder just adds bytes.
- HDR/EXR environments: `HDRLoader` (`three/addons/loaders/HDRLoader.js`) is the current name; `RGBELoader` still exists but is now a deprecated subclass that warns (renamed r180). `EXRLoader` and `UltraHDRLoader` cover the other HDR formats. All three return linear textures (`LinearSRGBColorSpace`), never `SRGBColorSpace`.
- Text: `FontLoader` plus `TextGeometry` from `three/addons/...` for extruded display type (use the `depth` option, not the removed `height`). For body text or many labels, prefer SDF text (`troika-three-text`, WebGL) or an HTML overlay (`CSS2DRenderer`) over `TextGeometry`; see `text-and-labels`.
- Removed or renamed loaders you may still see in old code or tutorials: `BasisTextureLoader` (removed r150, use `KTX2Loader`), `RGBMLoader` (removed r180), `LogLuvLoader` (removed r168, use `UltraHDRLoader` or `EXRLoader`), `HDRJPGLoader` (removed r167, use `UltraHDRLoader`), `USDZLoader` (deprecated r179, use `USDLoader`), `LWOLoader` and `VTKLoader` (deprecated, scheduled removal r195/r194; convert to glTF instead).
- Gaussian splat formats and loaders (`GaussianSplatPLYLoader`, `SPLATLoader`, `SPZLoader`, `KSPLATLoader`, `GLTFGaussianSplatLoaderExtension`) are covered in `gaussian-splats`, since they only work with `WebGPURenderer`.

## Pitfalls

- Forgetting a decoder a file actually needs: `GLTFLoader` throws or warns with a specific, actionable message (`No DRACOLoader instance provided`, `setKTX2Loader must be called`, `setMeshoptDecoder must be called`) rather than silently loading a blank model. `tw check`'s FAILED REQUESTS and console output name the exact loader; `tw glb` confirms which decoders a file needs before you even load it in a page.
- Calling `KTX2Loader.detectSupportAsync()`: deprecated since r181. `await renderer.init()` once, then call `detectSupport(renderer)` synchronously.
- Using `RGBELoader` from memory without knowing it now warns: it still works (it is a subclass of `HDRLoader`), but new code should import `HDRLoader` directly.
- Loading a compressed texture format the current GPU cannot decode: `KTX2Loader.detectSupport(renderer)` must run before `load()`, or the loader cannot pick a working transcode target.
- `TTFLoader` from the `three/addons` barrel import: since r185 it imports `opentype.js` from a CDN, so importing the whole barrel (`from 'three/addons'`) makes a network request and fails in Node or offline contexts. Import single addon files instead.

## Verify

- `tw glb <file.glb|.gltf>` reports size, draw calls, triangles, texture pixel dimensions, extensions used and which decoders they need, animations, world bounds, and budget warnings; read this before writing any loader code for a new asset.
- `tw check <page>` lists FAILED REQUESTS for a missing texture or `.bin` file and prints the loader's own error text (missing decoder, bad path, CORS) with a fix hint.
- `tw lint <dir>` flags removed loader names (`RGBMLoader`, `LogLuvLoader`, `HDRJPGLoader`, `BasisTextureLoader`) and deprecated ones (`RGBELoader`, `USDZLoader`, `.setDecoderConfig(`, `.detectSupportAsync(`).

## Notes

- 2026-09-26: written from the core r160-r186 research (sections 2, 3, 6) checked against `node_modules/three/examples/jsm/loaders/` in the installed 0.186.1, and the games research (section 4.2) for the glTF pipeline context.
