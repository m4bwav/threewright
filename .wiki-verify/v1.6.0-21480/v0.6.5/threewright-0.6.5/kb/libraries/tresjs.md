---
title: TresJS
kind: library
slug: tresjs
summary: Vue 3 renderer for three.js, the Vue equivalent of React Three Fiber; v5 is stable on WebGL, with experimental WebGPU through a renderer factory.
tags: [vue, tresjs, nuxt, declarative, webgpu, framework]
applies_to: ">=r159"
status: current
renderer: both
last_verified: 2026-09-26
sources: [https://github.com/Tresjs/tres, ai-docs/research/2026-09-26-ecosystem-libraries.md]
related: [react-three-fiber, threlte]
package: "@tresjs/core"
version_checked: "5.9.0"
---

# TresJS

## Use it for

- three.js scenes inside a Vue 3 or Nuxt app, written declaratively as Vue components (the Vue analog of React Three Fiber).
- Teams already committed to Vue who want the pmndrs-style ecosystem: `@tresjs/cientos` (drei-style helpers) and `@tresjs/post-processing` follow the core package in lockstep releases.

## Avoid it when

- The project is not Vue: use plain three.js with an import map, or React Three Fiber for a React app.
- Production WebGPU is required today: WebGPU support is experimental, passed as a renderer factory to `<TresCanvas :renderer>`; treat it as a preview path, not a shipped one.

## Setup

Versions checked 2026-09-26: `@tresjs/core` 5.9.0 (2026-09-14), peer `three >=0.133`, `vue >=3.4`. `@tresjs/cientos` and `@tresjs/post-processing` release in lockstep with core (cientos pins core exactly; post-processing depends on pmndrs `postprocessing >=0.169`, so it is WebGL only).

```sh
npm install @tresjs/core@5.9.0 three@0.186.1 vue@3.5.43
```

```vue
<script setup>
import { TresCanvas } from '@tresjs/core';
import { OrbitControls } from '@tresjs/cientos';
</script>

<template>
  <TresCanvas clear-color="#111" :dpr="[1, 2]">
    <TresPerspectiveCamera :position="[3, 2, 4]" />
    <OrbitControls make-default />
    <TresMesh>
      <TresTorusKnotGeometry :args="[0.5, 0.16, 160, 24]" />
      <TresMeshStandardMaterial color="#3fa7ff" />
    </TresMesh>
    <TresAmbientLight :intensity="0.5" />
    <TresDirectionalLight :position="[4, 6, 3]" :intensity="2" />
  </TresCanvas>
</template>
```

Experimental WebGPU: pass an async renderer factory to `<TresCanvas :renderer>` (see the TresJS WebGPU docs); expect gaps versus the WebGL path.

## Pitfalls

- Component names mirror three.js class names with a `Tres` prefix (`TresMesh`, `TresPerspectiveCamera`); a typo in the prefix or casing fails silently in Vue's template compiler rather than throwing a clear error.
- `@tresjs/cientos` pins to the exact `@tresjs/core` version it shipped with; upgrading one without the other can break at runtime with no type error, since the packages release together but are not automatically kept in lockstep by npm.
- `@tresjs/post-processing` wraps pmndrs `postprocessing`, which is WebGL only; do not expect it to work once a scene switches to the WebGPU renderer factory.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries).
