---
title: postprocessing (pmndrs)
kind: library
slug: postprocessing
summary: Merged effect passes for WebGLRenderer (bloom, AO, DoF, and more); the WebGL-only alternative to three's own EffectComposer, with no WebGPU plan.
tags: [postprocessing, bloom, effects, webgl, effectcomposer, react-three-postprocessing]
applies_to: ">=r168"
status: current
renderer: webgl
last_verified: 2026-09-26
sources: [https://github.com/pmndrs/postprocessing, ai-docs/research/2026-09-26-ecosystem-libraries.md]
related: [post-processing, react-three-fiber, bloom-webgl, bloom-webgpu]
package: "postprocessing"
version_checked: "6.39.5"
---

# postprocessing (pmndrs)

## Use it for

- WebGL scenes that need several merged effect passes (bloom, SSAO via n8ao, depth of field, chromatic aberration) with less boilerplate than hand-assembling `EffectComposer` passes.
- React Three Fiber projects, through `@react-three/postprocessing`, which wraps this package and was revived through 2026 (3.0.5 to 3.1.2 between August and September) with `EffectGroup`, `mergeMode` and `createEffectComponent`.

## Avoid it when

- The project targets `WebGPURenderer`: v6 has no WebGPU support and no plan for one found in its design issue; use three's `RenderPipeline` with TSL display nodes instead.
- Only one or two simple passes are needed (bloom, an output pass): three's own `EffectComposer` from `three/addons/postprocessing/*` avoids the extra dependency.
- v7 is tempting for its newer design: it is still beta (`7.0.0-beta.16`) and its three peer range stops below r184, so it cannot run on r186 today.

## Setup

Versions checked 2026-09-26: `postprocessing` 6.39.5 (2026-09-09), peer `three >=0.168.0 <0.187.0` (so r186 works; r187 will need a new release). `@react-three/postprocessing` 3.1.2 (2026-09-22) wraps `postprocessing ^6.36.0` and depends on `n8ao ^2.0.0` for SSAO.

```sh
npm install postprocessing@6.39.5
```

```js
import { EffectComposer, RenderPass, EffectPass, BloomEffect } from 'postprocessing';

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new EffectPass(camera, new BloomEffect({ intensity: 1.2 })));

renderer.setAnimationLoop(() => composer.render());
```

React Three Fiber:

```jsx
import { EffectComposer, Bloom, N8AO } from '@react-three/postprocessing';

<EffectComposer>
  <N8AO aoRadius={0.5} intensity={1} />
  <Bloom intensity={1.2} luminanceThreshold={0.8} />
</EffectComposer>
```

## Pitfalls

- v6's cap is `<0.187.0`; when three ships r187, this package needs a new release before it will install cleanly against it. Check the peer range against the exact `three` version in the project before assuming it works.
- It replaces the renderer's own render call; do not also call `renderer.render(scene, camera)` directly once `composer.render()` is wired into the loop, or the scene renders twice.
- `@react-three/postprocessing`'s `N8AO` depends on `n8ao`, which itself states it is "not yet compatible with WebGPU"; the whole chain is WebGL only.
- Mixing this with three's own `EffectComposer` passes in the same pipeline is not supported; pick one post-processing system per scene.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries).
