---
title: 3d-tiles-renderer
kind: library
slug: 3d-tiles-renderer
summary: OGC 3D Tiles for three.js, Babylon.js and R3F, with plugins for Google Photorealistic Tiles and Cesium ion; the base of most three.js geospatial work.
tags: [3d tiles, geospatial, cesium, google photorealistic tiles, globe, r3f, nasa-ammos]
applies_to: ">=r167"
status: current
renderer: webgl
last_verified: 2026-09-26
sources: [https://github.com/NASA-AMMOS/3DTilesRendererJS, ai-docs/research/2026-09-26-ecosystem-libraries.md, ai-docs/research/2026-09-26-scenarios-xr-and-testing.md]
related: [geospatial-and-globes, globe-gl]
package: "3d-tiles-renderer"
version_checked: "0.5.3"
---

# 3d-tiles-renderer

## Use it for

- Loading OGC 3D Tiles (real-world photogrammetry, terrain, city models) into a three.js scene: `TilesRenderer`, plus plugins `GoogleCloudAuthPlugin` (Google Photorealistic 3D Tiles) and `CesiumIonAuthPlugin` (Cesium ion).
- `GlobeControls` for globe-scale navigation, and the `/r3f` entry when the project is React Three Fiber.
- Pairing with `@takram/three-atmosphere` and `@takram/three-clouds` for a physically based sky and volumetric clouds over the tiles (three's own `webgl_loader_3dtiles` example does exactly this).

## Avoid it when

- The scene needs 2D map layers or huge non-tiled point/line data more than 3D Tiles specifically: pair with or prefer `deck.gl` for that, and keep this library for the tile geometry.
- `ImageOverlayPlugin` is required on `WebGPURenderer`: it uses a GLSL `ShaderMaterial`, which errors with "Material 'ShaderMaterial' is not compatible" there (open issue). Stay on `WebGLRenderer` for that plugin.

## Setup

Versions checked 2026-09-26: `3d-tiles-renderer` 0.5.3 (2026-09-18), optional peer `three >=0.167.0`, `@react-three/fiber ^8.17.9` or `^9`. three's own dev-branch example still pins an older 0.4.27.

```sh
npm install 3d-tiles-renderer@0.5.3
```

```js
import { TilesRenderer } from '3d-tiles-renderer';
import { GoogleCloudAuthPlugin } from '3d-tiles-renderer/plugins';

const tiles = new TilesRenderer();
tiles.registerPlugin(new GoogleCloudAuthPlugin({ apiToken: 'YOUR_KEY' }));
tiles.setCamera(camera);
tiles.setResolutionFromRenderer(camera, renderer);
scene.add(tiles.group);

renderer.setAnimationLoop(() => {
  tiles.update();
  renderer.render(scene, camera);
});
```

## Pitfalls

- Google Map Tiles API needs a key, billing, and attribution overlays required by the terms; session tokens expire and must be refreshed, which is easy to miss when a demo "stops loading tiles" after a while.
- Coordinate precision jitters far from the origin at planet scale; rebase to a local ENU (east-north-up) frame around the camera rather than rendering directly in ECEF coordinates.
- Tiles plus volumetric clouds can exceed mobile memory; set a tile error target and an LRU cache size deliberately rather than leaving defaults for a memory-constrained target.
- `ImageOverlayPlugin`'s WebGPU incompatibility is a plugin-specific gap, not a statement about the whole library: the core tile-loading path has no confirmed WebGPU support either (inferred from source), so test before assuming any part of this stack runs on `WebGPURenderer`.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries, scenarios-xr-and-testing).
