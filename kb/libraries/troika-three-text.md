---
title: troika-three-text
kind: library
slug: troika-three-text
summary: Worker-generated SDF text for three.js, mature on WebGLRenderer; no WebGPU support yet, so drei's Text component inherits the same limit.
tags: [text, sdf, typography, troika, drei, webgl]
applies_to: ">=r159"
status: current
renderer: webgl
last_verified: 2026-09-26
sources: [https://github.com/protectwise/troika, ai-docs/research/2026-09-26-ecosystem-libraries.md, ai-docs/research/2026-09-26-scenarios-xr-and-testing.md]
related: [text-and-labels, drei, css2d-labels]
package: "troika-three-text"
version_checked: "0.52.5"
---

# troika-three-text

## Use it for

- 3D text at any size, generated as an SDF (signed distance field) in a worker from a TTF, OTF or WOFF font, on `WebGLRenderer`: sharp at any scale, one draw call per distinct text block.
- drei's `Text` component in a React Three Fiber project, which is backed by this library.
- Hundreds of labels in a scene (a 3D chart, a network graph) where CSS2DRenderer's DOM-per-label approach would get heavy.

## Avoid it when

- The scene runs on `WebGPURenderer`: there is no WebGPU support (a TSL port issue, #359, is open with no resolution) and no drop-in replacement exists yet other than `three-msdf-text-utils`' `MSDFTextNodeMaterial` or the pre-release `@pmndrs/glyph`.
- Text must be selectable, read by a screen reader, or otherwise part of the accessible DOM: 3D text (SDF or otherwise) is invisible to assistive tech, so mirror it in the DOM (CSS2DRenderer or an `Html` overlay) regardless of which text renderer you pick.

## Setup

Versions checked 2026-09-26: `troika-three-text` 0.52.5 on `latest`; 0.53.0 exists but is untagged (adds `styleRanges` and Safari fixes); install it explicitly by version if you need those fixes ahead of the next `latest` bump.

```sh
npm install troika-three-text@0.52.5
```

```js
import { Text } from 'troika-three-text';

const text = new Text();
text.text = 'Hello, three.js';
text.fontSize = 0.2;
text.color = 0xffffff;
text.anchorX = 'center';
text.sync(); // required after any property change, runs the SDF generation in a worker
scene.add(text);
```

React Three Fiber, through drei:

```jsx
import { Text } from '@react-three/drei';
<Text fontSize={0.5} color="white" anchorX="center">Hello</Text>
```

## Pitfalls

- Forgetting `text.sync()` after changing `.text`, `.fontSize` or other properties leaves the mesh showing stale glyph geometry; every property change needs a `sync()` call (drei's `Text` handles this for you).
- Font atlas size and CJK glyph coverage: a font with thousands of CJK glyphs generates a much larger atlas than a Latin-only font; test with the real target languages, not just English placeholder text.
- SDF blur becomes visible at very small on-screen sizes; increase `fontSize` relative to camera distance rather than shrinking a large SDF text block down, or switch to an HTML overlay for body-text-sized labels.
- It does not run on `WebGPURenderer`; check the renderer before recommending it in a WebGPU scenario (generative art, games) and suggest `three-msdf-text-utils` or HTML overlays there instead.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries, scenarios-xr-and-testing).
