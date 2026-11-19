---
title: deck.gl
kind: library
slug: deck-gl
summary: GPU-accelerated map and data layers for millions of points, built on luma.gl rather than three.js; mixing it with a three.js scene needs custom layers or a shared context.
tags: [deck.gl, maps, geospatial, luma.gl, webgpu, big data]
applies_to: any
status: current
renderer: none
last_verified: 2026-09-26
sources: [https://deck.gl/docs/whats-new, https://deck.gl/docs/developer-guide/webgpu, ai-docs/research/2026-09-26-ecosystem-libraries.md, ai-docs/research/2026-09-26-scenarios-xr-and-testing.md]
related: [geospatial-and-globes, globe-gl, 3d-tiles-renderer]
package: "@deck.gl/core"
version_checked: "9.4.0"
---

# deck.gl

## Use it for

- Millions of points on a map: deck.gl's layer system is built for that scale in a way three.js's general-purpose renderer is not tuned for out of the box.
- Big geospatial data next to a map (MapLibre, Mapbox), when the job is data layers rather than a bespoke 3D scene.

## Avoid it when

- The project already owns a three.js scene and wants to add map data into it: deck.gl runs on `luma.gl`, not three.js, so there is no shared scene graph, camera, or renderer between the two. Mixing them in one GL context is possible but awkward (no established best practice found); prefer 3d-tiles-renderer or globe.gl when the target is "geospatial data inside a three.js scene."
- A three.js-only stack is a hard requirement (bundle size, one rendering technology to maintain): pick `3d-tiles-renderer`, `globe.gl` or `three-globe` instead, all of which are three.js-based.

## Setup

Versions checked 2026-09-26: `@deck.gl/core` 9.4.0 (2026-09-05). WebGPU support in `luma.gl` (the engine deck.gl runs on) is experimental.

```sh
npm install deck.gl@9.4.0
```

```js
import { Deck } from '@deck.gl/core';
import { ScatterplotLayer } from '@deck.gl/layers';

new Deck({
  canvas: 'deck-canvas',
  initialViewState: { longitude: -122.4, latitude: 37.8, zoom: 8 },
  controller: true,
  layers: [new ScatterplotLayer({ data: points, getPosition: (d) => d.coords, getRadius: 100 })],
});
```

## Pitfalls

- Do not expect to share a canvas or GL context between deck.gl and a three.js scene without deliberate, tested integration work; the two engines manage GPU state independently.
- WebGPU support is experimental through luma.gl; treat any deck.gl WebGPU claim as unverified until you confirm it against the specific version in use.
- deck.gl layers recompute aggressively on data changes; for streaming or frequently updated data, use its update triggers rather than replacing the whole layer array every frame.
- If the task is really "a globe with arcs and points" rather than "millions of map points," `globe.gl` (three.js-based) is usually the simpler and more consistent choice inside a three.js-centric project.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries, scenarios-xr-and-testing).
