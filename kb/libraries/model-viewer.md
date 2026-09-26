---
title: model-viewer
kind: library
slug: model-viewer
summary: Google's <model-viewer> web component, built on three.js, for showing a GLB with AR (Scene Viewer on Android, Quick Look on iOS) in one tag.
tags: [model-viewer, web component, ar, quick look, scene viewer, product viewer]
applies_to: any
status: current
renderer: webgl
last_verified: 2026-09-26
sources: [https://github.com/google/model-viewer, ai-docs/research/2026-09-26-ecosystem-libraries.md, ai-docs/research/2026-09-26-scenarios-xr-and-testing.md]
related: [product-viewer, three-vrm]
package: "@google/model-viewer"
version_checked: "4.3.1"
---

# model-viewer

## Use it for

- "Show a GLB, allow AR, maybe swap variants" with the least code: one custom element, no scene-graph work.
- AR out of the box: Scene Viewer on Android and AR Quick Look on iOS through `ios-src` (USDZ) or on-the-fly USDZ generation.
- Variant switching through `KHR_materials_variants` (`variantName`, `availableVariants`) when a product has color or material options baked into one GLB.

## Avoid it when

- The project needs custom shaders, many interactive parts, a rules-and-pricing configurator, or a scene that goes beyond one model with lights: use raw three.js or React Three Fiber and keep full control of the scene graph.
- Precise control over the underlying `three` version matters: the peer range is exactly `^0.183.0`, several minors behind r186; you cannot simply point it at your own newer `three` install.

## Setup

Versions checked 2026-09-26: `@google/model-viewer` 4.3.1 (2026-06-04), peer `three ^0.183.0`. v4.3.0 (2026-06-01) added multi-model scenes; v4.0 switched the default tone mapping to PBR Neutral.

```sh
npm install @google/model-viewer@4.3.1
```

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@google/model-viewer@4.3.1/dist/model-viewer.min.js"></script>
<model-viewer
  src="model.glb" ios-src="model.usdz"
  camera-controls ar shadow-intensity="1" exposure="1"
  alt="A product model">
</model-viewer>
```

Variants:

```html
<model-viewer src="shoe.glb" variant-name="Midnight" camera-controls></model-viewer>
```

```js
document.querySelector('model-viewer').availableVariants; // ['Midnight', 'Sunrise', ...]
```

## Pitfalls

- Pre-authored `ios-src` USDZ is more reliable for materials than the on-the-fly generator (unverified as a rigorous comparison, but a common report); export USDZ with three's `USDZExporter` or a DCC tool when material fidelity matters.
- Color mismatch from wrong texture color space: base-color textures need sRGB; do not tag normal or roughness maps the same way when authoring the source GLB.
- Loading every variant's textures up front wastes bandwidth; keep variant textures lazy where the authoring tool allows it, so only the selected variant downloads.
- `<model-viewer>` renders inside its own shadow DOM; CSS from the host page does not reach into it except through the documented custom properties, so a "why doesn't my CSS apply" question usually means look for a `--poster-color`-style property instead.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries, scenarios-xr-and-testing).
