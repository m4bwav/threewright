---
title: Post-processing on both renderers
slug: post-processing
kind: topic
summary: EffectComposer for WebGLRenderer versus RenderPipeline and TSL display nodes for WebGPURenderer, and why they never mix.
tags: [post-processing, effectcomposer, renderpipeline, bloom, tsl, outputpass]
applies_to: ">=r183"
status: current
renderer: both
last_verified: 2026-10-25
sources: [ai-docs/research/2026-09-26-core-r160-r186.md, ai-docs/research/2026-09-26-direction.md, https://raw.githubusercontent.com/mrdoob/three.js/r186/manual/pages/webgpu-postprocessing.html]
related: [tsl, materials, bloom-webgl, bloom-webgpu]
template: html-importmap
---

# Post-processing on both renderers

## Essentials

- Two separate pipelines, one per renderer; they do not interoperate.
  - `WebGLRenderer`: `EffectComposer` from `three/addons/postprocessing/EffectComposer.js`, with `RenderPass` first and passes such as `UnrealBloomPass`, `SMAAPass`, `FXAAPass`, `GTAOPass`, and `OutputPass` last. Since r155, tone mapping and `outputColorSpace` only apply when rendering to the screen, so a composer chain is linear and untonemapped unless `OutputPass` (or the older `GammaCorrectionShader`) is the final pass.
  - `WebGPURenderer`: `RenderPipeline` (renamed from `PostProcessing` in r183; the old name still works with a warning) plus `pass(scene, camera)` from `three/tsl` and TSL display-node functions from `three/addons/tsl/display/` (`bloom` in `BloomNode.js`, `fxaa`, `smaa`, `traa` in `TRAANode.js`, `dof` in `DepthOfFieldNode.js`, `ao` in `GTAONode.js`, `ssao` in `SSAONode.js` (new r186), `ssr`, `ssgi`, `gaussianBlur`, `outline`, `film`, `lut3D`, `oitPass` (order-independent transparency, new r186)). Set `renderPipeline.outputNode = <composed node>` and call `renderPipeline.render()` (or drive it from `renderer.setAnimationLoop`).
- `DirectRenderPipeline` (new r186, WebGPU only) applies tone mapping and color space transforms inside the material shaders and skips the intermediate output pass entirely, which is cheaper but "not compatible with materials that sample the framebuffer, such as transmissive materials".
- `EffectComposer`, its passes, `ShaderMaterial` and `onBeforeCompile` are never supported on `WebGPURenderer`; putting either in a WebGPU page fails, not just underperforms (see `materials`). There is no shared abstraction between the two pipelines: porting an effect means rewriting it in TSL, not swapping a class name.
- MRT and pass merging: `RenderPipeline` automatically merges compatible display nodes and shares a multi-render-target pass where it can, which is why the WebGPU path often needs fewer explicit passes than the equivalent `EffectComposer` chain.

## Pitfalls

- `EffectComposer` with no `OutputPass`: the classic silent mistake on the WebGL path. Since r155 the composer's own render targets are linear and never tone-mapped, so without `OutputPass` last the image looks dim and washed out even though the scene itself is lit and tone-mapped correctly. `tw lint`'s `composer-without-output-pass` rule catches this.
- `antialias: true` and then an `EffectComposer`: the flag only multisamples the canvas, and the composer renders the scene into its own `WebGLRenderTarget`, which it creates with no `samples` (r186 `EffectComposer.js`), so edges come out aliased again. Pass `new WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 })` as the composer's second argument, or add `SMAAPass` or `FXAAPass` near the end. `tw lint`'s `composer-without-aa` note catches a composer with neither.
- Importing an effect function straight from `three/tsl` or `three/webgpu` (`import { bloom } from 'three/tsl'`): effect nodes left core in r170. Import each one from its file under `three/addons/tsl/display/`.
- Constructing `new EffectComposer(webgpuRenderer)`: it will hit the `NodeBuilder` incompatibility the same way a bare `ShaderMaterial` does, because `EffectComposer`'s passes are built from `ShaderMaterial` internally.
- Assuming `renderAsync()` is still how you drive `RenderPipeline`: it is deprecated since r181 in favor of `render()` after `await renderer.init()`, or letting `setAnimationLoop` initialize the renderer for you.
- Using `DirectRenderPipeline` on the WebGL 2 fallback backend and expecting MSAA: edges stay aliased even with `antialias: true` (three.js #34947, closed as not planned; the limit is documented for r187). The maintainers call it a pipeline for special cases, mainly XR, not for wide use.
- Using `DirectRenderPipeline` on a scene with any transmissive material (glass, `MeshPhysicalMaterial` with `transmission > 0`): it is explicitly incompatible; use the regular `RenderPipeline` there.

## Verify

- `tw check <page>`: `result: OK`. A missing `OutputPass` shows up as a runtime warning about dim, untonemapped output rather than a console error, so also check `tw shot` on a scene with an obvious tone-mapping curve if the text checks look clean but colors seem wrong.
- `tw lint <dir>` runs `composer-without-output-pass`, `tsl-fx-import-from-core`, `effectcomposer-on-webgpu`, and `postprocessing-class` (flags the deprecated `PostProcessing` name) from `kb/rules/lint-rules.json`.
- `tw check <page> --eval "renderPipeline.needsUpdate"` (WebGPU) or inspecting the composer's pass list confirms the pipeline you built is the one that is actually rendering.

## Notes

- 2026-09-26: written from the core r160-r186 research (sections 1, 5, 6) and the direction research (sections 2.2, 3.2), checked against `node_modules/three/src/renderers/common/RenderPipeline.js` and `examples/jsm/postprocessing/` and `examples/jsm/tsl/display/` in the installed 0.186.1.
- 2026-10-25: composer MSAA pitfall and the `composer-without-aa` lint note (CGPP 3e §36.9.1, round 2 books track); `EffectComposer.js` in three 0.186.1 makes its default target with no samples.
