---
title: Plotly.js
kind: library
slug: plotly
summary: Stock 3D chart types (scatter3d, surface, mesh3d, isosurface, volume, cone) with hover and export; not three.js, but the first choice before hand-rolling a 3D chart.
tags: [plotly, chart, scatter3d, surface, isosurface, volume, data visualization, gl3d]
applies_to: any
status: current
renderer: none
last_verified: 2026-09-26
sources: [https://github.com/plotly/plotly.js, ai-docs/research/2026-09-26-ecosystem-libraries.md, ai-docs/research/2026-09-26-3d-dataviz-and-docs.md]
related: [3d-chart-in-docs, deck-gl, globe-gl]
package: "plotly.js"
version_checked: "4.1.1"
---

# Plotly.js

## Use it for

- Standard 3D chart types with hover, zoom and export built in: `scatter3d`, `surface`, `mesh3d`, `isosurface`, `volume`, `cone`, `streamtube`. This is the first choice in the `3d-chart-in-docs` scenario before reaching for three.js directly.
- Any document or notebook context that already renders Plotly figures (Jupyter, a report generator) where adding a 3D trace type is a one-line change, not a new rendering stack.
- The `plotly.js-gl3d-dist-min` bundle when only 3D chart types are needed and the full library's 2D trace types would be dead weight.

## Avoid it when

- The scene needs custom marks, custom interaction, more than about 100k points, or must match a bespoke design system's visual language: hand-roll it in three.js instead (the `3d-chart-in-docs` scenario's stack table covers this decision).
- Any three.js integration is needed: Plotly's 3D charts use their own stack.gl-based WebGL renderer, not three.js, so you cannot share a scene, camera or renderer between a Plotly chart and a three.js page.

## Setup

Versions checked 2026-09-26: `plotly.js` 4.1.1 (2026-09-14); `plotly.js-gl3d-dist-min` (3D-only bundle) and `plotly.js-dist-min` are separate npm packages built from the same source. v4.0.0 (2026-08-24) changed `hoveranywhere`/`clickanywhere` event values (date and category axes now return strings), removed mapbox traces, switched color parsing to culori, and changed the `geo.fitbounds` default — check any code migrating from 3.x against these.

```sh
npm install plotly.js-gl3d-dist-min@4.1.1
```

```js
import Plotly from 'plotly.js-gl3d-dist-min';

Plotly.newPlot(container, [{
  type: 'scatter3d', mode: 'markers',
  x: xs, y: ys, z: zs,
  marker: { size: 3, color: zs, colorscale: 'Viridis' },
}], {
  scene: { xaxis: { title: 'x' }, yaxis: { title: 'y' }, zaxis: { title: 'z' } },
});
```

## Pitfalls

- The `gl3d` bundle is about 1.67 MB unpacked; do not import the full `plotly.js` package when only 3D trace types are used, or you ship every 2D chart type unused.
- Migrating from Plotly 3.x to 4.x: `hoveranywhere`/`clickanywhere` payloads changed shape for date and category axes, mapbox traces are gone (move to `maplibre` trace types), and color parsing now goes through culori, which can shift edge-case color strings slightly.
- Encode data color unlit or with a perceptually uniform colorscale (`Viridis`, a cool-warm diverging map) on a shaded surface; a default colorscale plus real-time lighting can produce a legend swatch that does not match the rendered color.
- It renders through its own GL context per chart; embedding several Plotly 3D charts on one page multiplies GPU context usage faster than sharing one three.js renderer would.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries, 3d-dataviz-and-docs).
