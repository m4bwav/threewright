---
title: lil-gui
kind: library
slug: lil-gui
summary: Small dependency-free debug panel for vanilla three.js; the current answer to dat.gui, which three itself still bundles an older copy of.
tags: [gui, debug, tweak panel, dat.gui, vanilla, controls]
applies_to: any
status: current
renderer: none
last_verified: 2026-09-26
sources: [https://github.com/georgealways/lil-gui, ai-docs/research/2026-09-26-ecosystem-libraries.md]
related: [performance, generative-art]
package: "lil-gui"
version_checked: "0.21.0"
---

# lil-gui

## Use it for

- A quick debug or tuning panel in a vanilla three.js page: light intensities, material colors, animation speed, a "reset" button.
- Any scene where a live parameter panel helps iterate (generative art seeds, shader uniforms, physics constants) without building custom DOM UI.
- Replacing `dat.gui` (last release 2022, unmaintained) in existing code.

## Avoid it when

- The project is React Three Fiber: use `leva` (React-native tweak panels) instead, since lil-gui has no React bindings and mounting it inside a component tree fights React's own DOM management.
- The panel needs to ship to end users as product UI: lil-gui is a developer tool aesthetic, not a themeable app UI kit.

## Setup

Versions checked 2026-09-26: `lil-gui` 0.21.0 (2025-10-12). three r186 still bundles an older 0.17.0 copy in `examples/jsm/libs/lil-gui.module.min.js` for its own examples; install the current version yourself rather than importing three's bundled copy.

```sh
npm install lil-gui@0.21.0
```

```js
import { GUI } from 'lil-gui';

const gui = new GUI();
const params = { color: '#3fa7ff', speed: 1, wireframe: false };

gui.addColor(params, 'color').onChange((v) => material.color.set(v));
gui.add(params, 'speed', 0, 3, 0.01);
gui.add(params, 'wireframe').onChange((v) => (material.wireframe = v));
```

## Pitfalls

- `addColor` expects a hex string or a `{r,g,b}` object depending on the source value's type; passing a `THREE.Color` instance directly does not update the way you expect, convert with `.getHexString()` first or bind through a plain object as above.
- Building a fresh `GUI()` on every hot reload or scene rebuild without calling `gui.destroy()` on the old one leaves duplicate panels stacked in the DOM.
- It has no built-in persistence; use `gui.save()` / `gui.load()` with `localStorage` yourself if settings should survive a reload.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries).
