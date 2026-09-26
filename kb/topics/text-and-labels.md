---
title: 3D text and labels
slug: text-and-labels
kind: topic
summary: CSS2DRenderer for a handful of accessible DOM labels, troika-three-text for hundreds, and TextGeometry for extruded display type only.
tags: [css2drenderer, troika, textgeometry, labels, sdf, accessibility]
applies_to: ">=r186"
status: current
renderer: webgl
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-3d-dataviz-and-docs.md, ai-docs/research/2026-09-26-scenarios-xr-and-testing.md, ai-docs/research/2026-09-26-core-r160-r186.md]
related: [css2d-labels, accessibility, materials]
template: html-importmap
---

# 3D text and labels

## Essentials

- Three ways to put text in a three.js scene, in order of how many labels they scale to:
  - `CSS2DRenderer`/`CSS2DObject` (`three/addons/renderers/CSS2DRenderer.js`): real DOM elements positioned to track a 3D point. Simple, crisp at any zoom, selectable, and readable by screen readers because it is actual HTML. Good for tens of labels (axis titles, tick labels, a hover tooltip); it slows down with many labels because each one is a DOM element the browser has to lay out and paint every frame. r186 added rotation support.
  - `troika-three-text` (npm, not part of three): SDF text rendered inside the WebGL scene, laid out in a worker from TTF/OTF/WOFF fonts. Scales to hundreds of labels because it is GPU-rendered geometry, not DOM, but its text is invisible to screen readers and to page search, so accessible content needs a DOM mirror as well. Mature for WebGL; WebGPU/TSL compatibility has been an open gap in the troika forum threads as of 2026, so check current status before choosing it for a `WebGPURenderer` page.
  - `TextGeometry` (`three/addons/geometries/TextGeometry.js`, with `FontLoader`) for extruded, display-type 3D lettering (a logo, a title card), not body text: it is a real mesh with real triangle cost per glyph, so it does not scale to sentences or many labels. Use its `depth` option, not the removed `height` (renamed r163, the `height` fallback removed in r173, so writing `height` today is silently ignored and the extrusion defaults to 50 units).
- Pre-release, WebGPU-first alternatives exist but are not yet mature enough to default to: `@pmndrs/glyph` (pmndrs/text) does WASM shaping and layout with Bitmap/MSDF/Slug rendering across WebGPU and WebGL2, and a TSL `MSDFTextNodeMaterial` pattern has been demonstrated (Codrops, Jan 2026); both are worth knowing about, not yet the default recommendation.
- Text that carries information (a chart's axis labels, a data table's values) needs a DOM mirror regardless of which in-scene technique renders it, because none of the in-scene options except `CSS2DObject` are reachable by assistive technology on their own; see `accessibility`.

## Pitfalls

- Choosing `TextGeometry` for a sentence or a paragraph: heavy triangle cost for text that would be a few hundred bytes as SDF or DOM text, and it does not anti-alias as cleanly at small sizes.
- Choosing `troika-three-text` for a `WebGPURenderer` page without checking current WebGPU/TSL support first: it has historically been a WebGL-only library, so it may fail the same way any GLSL-based library does on that renderer.
- Relying on `CSS2DObject` for hundreds of labels: each one is a real DOM node the browser lays out every frame, so frame rate degrades well before troika's SDF text would show the same slowdown.
- Forgetting that SDF or extruded text is invisible to a screen reader: a legend or callout rendered only inside the canvas gives assistive technology nothing to read, even though it is visually present.
- Using `height` on `TextGeometry`'s options object out of habit from an old tutorial: it silently does nothing in r186 and the depth defaults to 50, which usually looks wrong rather than erroring.

## Verify

- `tw scene <page>` shows whether label objects (a `CSS2DObject`, a troika `Text` mesh, or a `TextGeometry` mesh) exist in the graph at all, and how many, before you need a screenshot to check placement.
- `tw check <page>`: `result: OK` with no console errors from a missing font file or a bad `FontLoader` path.
- A visual check (`tw shot`) is appropriate for confirming label placement and legibility once the text objects are confirmed present in text.

## Notes

- 2026-09-26: written from the dataviz research (section 2, the CSS2D-versus-troika scaling rule and its accessibility note) and the scenarios research (section A9, current state of troika, glyph and MSDF text options), with the `TextGeometry` `depth`/`height` fact checked against the core r160-r186 research and `node_modules/three/examples/jsm/renderers/CSS2DRenderer.js` in the installed 0.186.1.
