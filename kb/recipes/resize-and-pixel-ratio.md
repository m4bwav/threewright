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
  renderer.setSize(width, height, false); // false: leave the canvas's CSS size alone; your CSS must size it (below)
});
ro.observe(container);
```

With `false`, the canvas CSS size is not set, so give it one: `#viewer canvas { display: block; width: 100%; height: 100%; }`. Without that rule the canvas shows at its drawing-buffer size, twice the container at DPR 2.

For an orthographic camera, resize its `left`/`right`/`top`/`bottom` in proportion to the new aspect ratio instead of setting `aspect` (which `OrthographicCamera` does not have): `const halfHeight = orthoHalfHeight; camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect; camera.updateProjectionMatrix();`.

## Verify

- `tw check <page> --size 640x360` then `--size 1280x720`: the `camera:` line's `aspect` must equal width/height for each size, which proves the handler runs and not only exists.
- `tw check <page> --dpr 3`: the `renderer:` line's `canvas WxH dpr N` must show `dpr 2` and a drawing buffer twice the CSS size. That line prints the renderer's pixel ratio, not the device's.
- `tw check` flags `camera.aspect ... does not match the canvas` when the handler never sets `camera.aspect`. It does not catch a missing `updateProjectionMatrix()`: tw compares `camera.aspect` only, so a stale projection matrix passes. Look at one `tw shot` for a stretched image in that case.
- Verified 2026-09-26 on Windows 11, Chrome 153 headless, RTX 5060 Ti (WebGL), three 0.186.1 from node_modules. Two harness pages ran each snippet unchanged with a sphere and a page function `report()` that returns device DPR, pixel ratio, CSS size, drawing-buffer size and aspect. `tw check --eval "report()"` printed, full viewport: `--size 640x360 --dpr 1` gave `css 640x360 buffer 640x360 aspect 1.7778`; `--size 400x800 --dpr 3` gave `dpr 3 pixelRatio 2 css 400x800 buffer 800x1600 aspect 0.5000`; `--dpr 1.5` gave `buffer 1440x810`. Container variant (a 50% by 60% div): `--size 400x800 --dpr 3` gave `container 200x480 css 200x480 buffer 400x960 aspect 0.4167`. All runs `result: OK`, `tw lint` 0 errors and 0 warnings. The `tw shot` showed a round sphere filling the container.

## Notes

- 2026-09-26: written from the games research (section 2, general resize practice) and the scenarios research's mobile performance guidance on capping `devicePixelRatio`, both cross-checked against `PerspectiveCamera`/`OrthographicCamera` in the installed three 0.186.1.
- 2026-09-26: ran both snippets (see Verify). The code was right. Added the canvas CSS rule the container variant needs: a copy without it rendered at 960x648 CSS in a 480x324 container at DPR 2. Corrected the Verify claim that tw catches a missing `updateProjectionMatrix()`; a harness without that call passed `tw check` with `result: OK`.
