---
title: Resize and pixel ratio
slug: resize-and-pixel-ratio
kind: recipe
summary: Keep the canvas, camera aspect and pixel ratio all in sync on resize, capped so phones do not render 9x the pixels they need to.
tags: [resize, pixel ratio, aspect, devicePixelRatio, ResizeObserver]
applies_to: any
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-games.md, ai-docs/research/2026-09-26-scenarios-xr-and-testing.md]
related: [performance, cameras-and-controls]
template: html-importmap
---

# Resize and pixel ratio

## Goal

A canvas that tracks its container's size correctly on window resize (or container resize, for a canvas that is not full-viewport), with the camera's aspect ratio and projection matrix kept in sync, and the device pixel ratio capped so a phone at DPR 3 does not render nine times the pixels of DPR 1 for the same visible size.

## Code

Full-viewport canvas (the common case):

```js
function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix(); // required after changing aspect, or the image stretches

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap at 2 (lower on known low-end phones)
  renderer.setSize(width, height);
}

window.addEventListener('resize', onResize);
onResize(); // run once up front, not only on the first resize event
```

A canvas inside a container of its own (a card, a docs figure, a sidebar panel), where `window.innerWidth`/`innerHeight` is the wrong size to read:

```js
const container = document.getElementById('viewer');

const ro = new ResizeObserver((entries) => {
  const { width, height } = entries[0].contentRect;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height, false); // false: do not also set the canvas's CSS size, since the container's CSS already sizes it
});
ro.observe(container);
```

For an orthographic camera, resize its `left`/`right`/`top`/`bottom` in proportion to the new aspect ratio instead of setting `aspect` (which `OrthographicCamera` does not have): `const halfHeight = orthoHalfHeight; camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect; camera.updateProjectionMatrix();`.

## Verify

- `tw check <page>` reports `canvas WxH dpr N` in its renderer line and flags a mismatch as a runtime warning (`camera.aspect ... does not match the canvas`) when the resize handler forgot `updateProjectionMatrix()` or used the wrong dimensions.
- `tw check <page> --size 640x360` then `--size 1280x720` on the same page, comparing the reported `camera: ... aspect` value against `width/height` for each size, confirms the handler is actually wired and not just present in the source.
- A visual check is only needed to confirm the resized image does not look stretched or squashed once the text check above confirms the aspect ratio itself is correct.

## Notes

- 2026-09-26: written from the games research (section 2, general resize practice) and the scenarios research's mobile performance guidance on capping `devicePixelRatio`, both cross-checked against `PerspectiveCamera`/`OrthographicCamera` in the installed three 0.186.1.
