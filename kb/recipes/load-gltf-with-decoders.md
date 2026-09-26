---
title: Load a glTF with decoders
slug: load-gltf-with-decoders
kind: recipe
summary: Wire GLTFLoader with the Draco, KTX2 and Meshopt decoders a compressed GLB actually needs, checked with tw glb first.
tags: [gltfloader, draco, ktx2, meshopt, decoders, gltf]
applies_to: ">=r185"
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-core-r160-r186.md]
related: [loaders-and-assets, optimize-gltf, fit-camera-to-object]
template: html-importmap
---

# Load a glTF with decoders

## Goal

Load a compressed GLB (Draco geometry, KTX2 textures, or Meshopt-compressed geometry) without the loader throwing `No DRACOLoader instance provided` or leaving textures blank. Check which decoders a specific file actually needs first with `tw glb`, so you wire only what is used.

## Code

```js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// await renderer.init() first if this is a WebGPURenderer page; KTX2Loader.detectSupport
// needs the renderer already initialized.

const dracoLoader = new DRACOLoader();
// Since r185 the default decoder URLs resolve next to the DRACOLoader module itself,
// so setDecoderPath() is only needed when the addons folder is not actually served
// from where the module import resolved (a different CDN mirror, a custom build).
// dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/libs/draco/');

const ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/libs/basis/');
ktx2Loader.detectSupport(renderer); // must run after the transcoder path is set and the renderer exists

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
gltfLoader.setKTX2Loader(ktx2Loader);
gltfLoader.setMeshoptDecoder(MeshoptDecoder);

gltfLoader.load(
  'model.glb',
  (gltf) => {
    scene.add(gltf.scene);
    // fitCameraToObject(camera, gltf.scene, controls);; see the fit-camera-to-object recipe
  },
  undefined, // onProgress
  (error) => console.error('GLTFLoader failed:', error)
);
```

Only wire the decoder(s) a given file actually needs. `tw glb model.glb` names them by inspecting the file's extensions before you write any loader code, so an asset with no Draco or KTX2 content does not need `setDRACOLoader`/`setKTX2Loader` at all. `GLTFLoader` tags base color and emissive textures `SRGBColorSpace` itself; you never need to set `colorSpace` by hand on textures it loads (see `color-management`).

## Verify

- `tw glb model.glb` reports size, draw calls, triangles, texture pixel dimensions, extensions used and exactly which decoders they need; read this before writing the loader code, not after a failure.
- `tw check <page>` lists FAILED REQUESTS for a missing `.bin` or texture file, and prints the loader's own error text (a missing decoder, a bad transcoder path, CORS) with a fix hint, rather than a generic failure.
- `tw check <page> --eval "scene.getObjectByName('<a name from the model>') !== undefined"` confirms the model actually loaded and attached, in text, before any screenshot.

## Notes

- 2026-09-26: written from the core r160-r186 research (sections 2, 6, the r185 Draco default decoder path change) checked against `node_modules/three/examples/jsm/loaders/DRACOLoader.js`, `KTX2Loader.js` and `GLTFLoader.js` in the installed 0.186.1. Not run through `tw check` with a real GLB in this pass; the API calls themselves match the installed source exactly.
