---
title: globe.gl
kind: library
slug: globe-gl
summary: One-call data globes (arcs, points, hexbins) built on three-globe; the fastest path to a globe visualization without owning the scene graph.
tags: [globe, geospatial, data visualization, arcs, points, three-globe]
applies_to: ">=r179"
status: current
renderer: webgl
last_verified: 2026-09-26
sources: [https://github.com/vasturiano/globe.gl, ai-docs/research/2026-09-26-ecosystem-libraries.md, ai-docs/research/2026-09-26-3d-dataviz-and-docs.md]
related: [geospatial-and-globes, 3d-tiles-renderer, deck-gl, 3d-chart-in-docs]
package: "globe.gl"
version_checked: "2.46.2"
---

# globe.gl

## Use it for

- Data globes with arcs, points, hexbins and clouds in one call, when the job is showing globe-scale data rather than owning a bespoke three.js scene.
- The `react-globe.gl` wrapper (2.38.0) when the project is React and wants the same data-driven API as a component.
- The default globe pick in the `3d-chart-in-docs` and `geospatial-and-globes` scenarios when a full custom globe scene is not needed.

## Avoid it when

- The globe must live inside a larger three.js scene you already own (custom camera rig, other objects sharing the renderer): use `three-globe` directly (globe.gl's underlying object) and add it to your own scene graph instead of letting globe.gl own the canvas.
- WebGPU support is required: whether it is exposed is unverified; its `three-render-objects` dependency (1.42.0) has a `useWebGPU` option, but whether globe.gl surfaces it is unconfirmed. Treat this stack as WebGL until checked directly.

## Setup

Versions checked 2026-09-26: `globe.gl` 2.46.2 (2026-08-22), `react-globe.gl` 2.38.0, depends on `three >=0.179 <1`.

```sh
npm install globe.gl@2.46.2
```

```js
import Globe from 'globe.gl';

const globe = Globe()(document.getElementById('globeViz'))
  .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
  .pointsData(data)
  .pointLat('lat').pointLng('lng').pointColor(() => '#ff5533')
  .arcsData(routes)
  .arcStartLat('startLat').arcStartLng('startLng')
  .arcEndLat('endLat').arcEndLng('endLng');
```

## Pitfalls

- globe.gl owns its own render loop and camera controls; do not also drive the same canvas with an outer three.js animation loop, or the two fight over frame timing.
- Point and arc counts that look small in a table can be large once expanded across a whole globe of markers; watch draw calls if the data set grows past a few thousand entries and consider hexbin aggregation instead of raw points.
- It bundles its own `three` dependency range (`>=0.179 <1`), so pin the project's own `three` inside that range or expect peer-dependency warnings.
- For a globe embedded in a document (the `claude-artifacts-and-chat` or `3d-chart-in-docs` scenarios), keep an accessible data table alongside it; a rotating globe alone is not a substitute for exact values.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries, 3d-dataviz-and-docs).
