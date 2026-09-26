---
title: Threlte
kind: library
slug: threlte
summary: Svelte 5 renderer for three.js; v8 supports WebGPU through a createRenderer prop, ahead of the equivalent React and Vue integrations.
tags: [svelte, threlte, declarative, webgpu, framework]
applies_to: ">=r172"
status: current
renderer: both
last_verified: 2026-09-26
sources: [https://github.com/threlte/threlte, ai-docs/research/2026-09-26-ecosystem-libraries.md]
related: [react-three-fiber, tresjs]
package: "@threlte/core"
version_checked: "8.6.1"
---

# Threlte

## Use it for

- three.js scenes inside a Svelte 5 app, written as Svelte components and stores instead of imperative scene-graph code.
- Projects that want WebGPU today with less friction than the React or Vue equivalents: Threlte 8's `createRenderer` prop can return a `WebGPURenderer` directly, and the ecosystem note lists it among the WebGPU-ready frameworks.
- `@threlte/extras` for controls, text, glTF loading and interactivity helpers layered on core.

## Avoid it when

- The project is not Svelte 5: use React Three Fiber, TresJS, or plain three.js depending on the stack.
- A dependency in `@threlte/extras` is WebGL only (it bundles troika for text) and the scene must run purely on WebGPU; check that specific helper before relying on it there.

## Setup

Versions checked 2026-09-26: `@threlte/core` 8.6.1 (2026-09-24), peer `three >=0.172`, `svelte >=5`. `@threlte/extras` 9.22.0 releases alongside core.

```sh
npm install @threlte/core@8.6.1 @threlte/extras@9.22.0 three@0.186.1 svelte@5.57.1
```

```svelte
<script>
  import { Canvas, T } from '@threlte/core';
  import { OrbitControls } from '@threlte/extras';
</script>

<Canvas>
  <T.PerspectiveCamera makeDefault position={[3, 2, 4]}>
    <OrbitControls enableDamping />
  </T.PerspectiveCamera>
  <T.DirectionalLight position={[4, 6, 3]} intensity={2} />
  <T.Mesh>
    <T.TorusKnotGeometry args={[0.5, 0.16, 160, 24]} />
    <T.MeshStandardMaterial color="#3fa7ff" />
  </T.Mesh>
</Canvas>
```

WebGPU: pass a renderer factory to `<Canvas createRenderer={...}>` that constructs and initializes a `WebGPURenderer` before returning it (mirrors R3F's async `gl` factory pattern).

## Pitfalls

- `T.X` components mirror three.js class names (`T.Mesh`, `T.MeshStandardMaterial`); as with TresJS, a mistyped class name fails to render rather than throwing a clear error.
- `@threlte/extras` bundling troika means any text component through it inherits troika's WebGL-only limitation even inside an otherwise WebGPU scene.
- Threlte's reactivity runs through Svelte 5 runes; mixing Svelte 4-style stores from older examples with Svelte 5 code in the same component can behave unexpectedly. Match the Svelte major version in any example you copy.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries).
