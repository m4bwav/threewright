---
title: Maps and geospatial in 3D
slug: geospatial-and-globes
kind: scenario
summary: 3D Tiles for real-world photogrammetry and terrain, globe.gl for data globes, MapLibre custom layers for maps; rebase coordinates to avoid float jitter at planet scale.
tags: [geospatial, 3d tiles, globe, maplibre, cesium, google photorealistic tiles, deck.gl, terrain]
applies_to: ">=r167"
status: current
renderer: webgl
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-scenarios-xr-and-testing.md, ai-docs/research/2026-09-26-ecosystem-libraries.md]
related: [3d-tiles-renderer, globe-gl, deck-gl, renderer-choice, 3d-chart-in-docs]
template: html-importmap
---

# Maps and geospatial in 3D

## When

- Real-world 3D Tiles (photogrammetry, city models, terrain) need to render in a three.js scene: Google Photorealistic 3D Tiles, Cesium ion assets, or a custom tileset.
- A data globe (arcs, points, hexbins) is the deliverable, not a full custom 3D scene.
- 3D content must sit on top of a 2D web map (MapLibre, Mapbox) as a custom layer: a model on terrain, a model with a shadow, 3D tiles rendered inside the map's own camera.

## Stack

| need | first choice |
|---|---|
| 3D Tiles (Google, Cesium ion, custom) | `3d-tiles-renderer`, with `GoogleCloudAuthPlugin` or `CesiumIonAuthPlugin`, plus `GlobeControls` for globe-scale navigation |
| physically based sky and clouds over tiles | `@takram/three-atmosphere` and `@takram/three-clouds` (WebGL only) |
| a data globe (arcs, points, hexbins) | `globe.gl` (or `three-globe` directly inside your own scene) |
| 3D on a 2D map | MapLibre GL JS custom layers with three.js, or `maplibre-three-plugin` to bridge both |
| millions of map points, big data layers | `deck.gl` (not three.js; interleaves with MapLibre, awkward to mix with a three.js scene directly) |

- `WebGLRenderer` is the default: MapLibre custom layers share a WebGL context, `@takram/three-clouds` is WebGL only, and `3d-tiles-renderer`'s `ImageOverlayPlugin` errors on `WebGPURenderer` ("Material 'ShaderMaterial' is not compatible", an open issue). Consider `WebGPURenderer` only for a standalone globe with no MapLibre and no WebGL-only plugins, using `@takram/three-atmosphere`'s `/webgpu` entry.

## Build

- No verified geospatial template exists yet (a `globe` template is planned but not built). Start from `tw new html-importmap <dir>` and add `3d-tiles-renderer` or `globe.gl` from there.
- ECEF or a local ENU (east-north-up) frame with a rebased origin around the camera; do not render directly in raw ECEF coordinates at planet scale, or float precision jitters visibly.
- A logarithmic depth buffer, or reversed depth, at globe scale to avoid z-fighting between near and far geometry.
- Set a tile error target and an LRU cache size deliberately; tiles plus volumetric clouds can exceed mobile memory with defaults left untouched.
- Attribution overlays are required by Google's 3D Tiles terms; Google Map Tiles API needs a key, billing, and session tokens that expire and must be refreshed.

## Pitfalls

- Google Map Tiles API session tokens expire; a demo that "stops loading tiles after a while" usually means an expired or missing refresh, not a code bug.
- `3d-tiles-renderer`'s `ImageOverlayPlugin` is WebGPU-incompatible; test the exact plugin set in use rather than assuming the whole library's WebGPU story from its core tile loader.
- Mixing `deck.gl` (luma.gl) and a three.js scene in one GL context has no established best-practice pattern; do not promise a clean integration without testing it directly for the specific combination needed.
- Coordinate float jitter far from the origin shows up as visible vertex "swimming" during camera movement; rebase before shipping, do not patch it with a larger near/far range.

## Verify

- `tw check <page>` is `result: OK` with sane bounds; a camera far outside the expected bounds at planet scale is the first sign of a missing origin rebase.
- `tw shot <page> --size 960x540` for a framing check of the globe or tileset; look specifically for z-fighting or swimming vertices at the frame's edges.
- Confirm attribution overlays are present in a real screenshot when using Google or Cesium tiles; this is a terms-of-service requirement, not just a visual nicety.

## Notes

- 2026-09-26: written from the 2026-09-26 research (scenarios-xr-and-testing A4, ecosystem-libraries). WebGPU support in `3d-tiles-renderer`'s core loader, `globe.gl`'s `useWebGPU` exposure, and deck.gl/luma.gl's WebGPU status are all unverified and likely to change.
