---
title: Environment lighting
slug: environment-lighting
kind: recipe
summary: Light PBR materials with a generated RoomEnvironment (no download) or an HDR file through PMREMGenerator, so nothing renders black.
tags: [pmremgenerator, roomenvironment, hdrloader, environment, ibl]
applies_to: ">=r180"
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-core-r160-r186.md, ai-docs/research/2026-09-26-scenarios-xr-and-testing.md]
related: [lighting-and-shadows, color-management, materials]
template: html-importmap
---

# Environment lighting

## Goal

`MeshStandardMaterial` and other lit materials render pure black with no light and no `scene.environment` at all. Give every scene one or the other. `RoomEnvironment` through `PMREMGenerator` lights PBR materials plausibly with zero network requests; an HDR/EXR file through the same generator gives a specific, art-directed look when one is available.

## Code

No-download environment, for a chart, a product thumbnail, or anywhere a specific HDR is not worth the bytes:

```js
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
// pmrem.dispose(); // once you are done generating environments, not the texture itself
```

A specific HDR environment, for a hero product shot or a branded scene:

```js
import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'; // the current name since r180

const pmrem = new THREE.PMREMGenerator(renderer);
new HDRLoader().load('studio.hdr', (hdrTexture) => {
  scene.environment = pmrem.fromEquirectangular(hdrTexture).texture;
  scene.background = scene.environment; // optional: show the HDR itself, not only its lighting
  hdrTexture.dispose(); // the source equirect texture; pmrem.fromEquirectangular() copies what it needs
});
```

On `WebGPURenderer`, `await renderer.init()` before calling `pmrem.fromScene()`/`fromEquirectangular()`: the `*Async` PMREM methods (`fromSceneAsync`, `fromEquirectangularAsync`, `fromCubemapAsync`) are deprecated since r181 in favor of the synchronous versions after init.

## Verify

- `tw check <page>` reports `environment true` (or `false`) in its scene summary line, and its runtime warnings flag `lit materials but no lights and no scene.environment` directly when neither is set; this is the first thing to check for an unexpectedly black scene, before touching color space or camera position at all.
- `tw check <page> --eval "renderer.info.memory"` before and after repeated environment swaps (see `dispose-a-scene`) confirms old PMREM render targets are not accumulating if you regenerate the environment at runtime (a day/night cycle, a variant switch).
- A visual check (`tw shot`) confirms the environment's actual look (warm versus cool, bright versus dim) once the text check above rules out "no environment at all" as the cause of a dark render.

## Notes

- 2026-09-26: written from the core r160-r186 research (sections 2, 3, the r180 `HDRLoader` rename and r181 PMREM async deprecation) checked against `node_modules/three/examples/jsm/environments/RoomEnvironment.js`, `loaders/HDRLoader.js` and `src/extras/PMREMGenerator.js` in the installed 0.186.1.
