---
title: TSL (Three.js Shading Language)
slug: tsl
kind: topic
summary: What TSL is, its entry point and renamed functions, node materials, compute, and where it does and does not reach WebGLRenderer in r186.
tags: [tsl, node material, shader, wgsl, glsl, compute, colorNode, Fn]
applies_to: ">=r171"
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-direction.md, ai-docs/research/2026-09-26-core-r160-r186.md, https://raw.githubusercontent.com/mrdoob/three.js/r186/manual/pages/webgpurenderer.html]
related: [webgpu-support, materials, post-processing, tsl-custom-material]
template: html-webgpu
---

# TSL (Three.js Shading Language)

## Essentials

- TSL is "the new shader standard for Three.js" (TSL Guide, threejs.org/tsl/, present since r186). It is a JavaScript function-composition API (`color()`, `uniform()`, `Fn()`, `time`, `positionLocal`, ...) that compiles to WGSL for the WebGPU backend and to GLSL for the WebGL 2 backend, so one source runs on both. Import it from `three/tsl` (`build/three.tsl.js`).
- `three/tsl` imports the bare specifier `three/webgpu`, so any page that imports TSL needs an import-map entry for `three/webgpu` too, even if the code never imports it directly. Map `three` itself to `three.webgpu.js` as well, so addons that import bare `three` share the same build (the pattern used by all of the official WebGPU examples: 230 map `three`, 229 also map `three/webgpu`, 228 map `three/tsl`).
- Write custom appearance with node materials (`MeshStandardNodeMaterial`, `MeshPhysicalNodeMaterial`, ...) and their `colorNode`, `positionNode`, `emissiveNode`, `normalNode` properties, not `ShaderMaterial` or `onBeforeCompile`, which WebGPURenderer does not support at all (the r186 manual: "not supported"; the source logs `NodeBuilder: Material "ShaderMaterial" is not compatible.` and falls back to a default node material).
- Compute: `Fn( ... )().compute( count )` then `await renderer.computeAsync( computeNode )` (or `renderer.compute()` after `await renderer.init()`). r186 added `compileComputeAsync()` for precompiling compute pipelines. The WebGL 2 backend emulates 1D compute through transform feedback: the count must be a single number, no 2D/3D dispatch, no indirect storage buffers, and it errors on subgroup nodes.
- Post-processing is `RenderPipeline` (renamed from `PostProcessing` in r183) plus `pass(scene, camera)` and TSL display nodes from `three/addons/tsl/display/` (`bloom`, `fxaa`, `smaa`, `traa`, `dof`, `ao`, `ssao`, `ssr`, `ssgi`, `gaussianBlur`, `outline`, `film`, `lut3D`, `oitPass`). See `post-processing` for both pipelines side by side.
- A limited bridge lets node materials render inside WebGLRenderer: `renderer.setNodesHandler( new WebGLNodesHandler() )` from `three/addons/tsl/WebGLNodesHandler.js` (r184), described as preparation for migrating to WebGPURenderer. Its limits: no VSM shadows, no MRT, no transmission, no WebGPU post-processing stack, no storage textures; instanced-mesh geometry cannot be shared, and fog or environment changes need `material.dispose()`.
- Renamed functions still in circulation from older tutorials, current names in r186: `viewportTopLeft` -> `viewportUV` (r168), `uniforms()` -> `uniformArray()` (r168), `TextureNode.uv()` -> `.sample()` (renamed r172, removed r183), `.varying()`/`.vertexStage()` -> `.toVarying()`/`.toVertexStage()` (r173), `transformedNormalView`/`World` -> `normalView`/`normalWorld` (r178), `label()` -> `setName()` (r179), `PI2` -> `TWO_PI`, `cache()` -> `isolate()` (r181), `directionToColor()`/`colorToDirection()` -> `packNormalToRGB()`/`unpackRGBToNormal()` (r185).
- Porting existing GLSL or ShaderToy code: three ships a `Transpiler` with `GLSLDecoder`, `ShaderToyDecoder`, `TSLEncoder` and `WGSLEncoder`. `glslFn` (WebGL backend only) and `wgslFn` (WebGPU backend only) are escape hatches for a raw snippet inside an otherwise TSL material.

## Pitfalls

- Forgetting the `three/webgpu` import-map entry when only `three/tsl` is imported: the page fails to resolve the bare `three/webgpu` specifier that `three.tsl.js` imports internally. Always include both, plus `three/addons/`.
- Importing a post-processing effect function from `three/tsl` or `three/webgpu` directly (`import { bloom } from 'three/tsl'`): effect nodes left core in r170 and now live only in `three/addons/tsl/display/*.js` (`bloom` from `BloomNode.js`, `dof` from `DepthOfFieldNode.js`, `ao` from `GTAONode.js`, and so on).
- Using an invented TSL function name: practitioner reports describe model output with "deprecated imports, phantom functions that don't exist, and compute shaders that compile but render nothing." Check every TSL import against the installed `node_modules/three/src/nodes` or the TSL Guide before writing it from memory.
- Putting `ShaderMaterial`, `RawShaderMaterial` or `.onBeforeCompile` in a file that also constructs `WebGPURenderer`: it silently renders as a default node material with a console error, not a shader error you would notice from the color. `tw lint` flags this combination.
- Assuming a WGSL error will look like a JS error: WGSL compile errors are reported through `THREE.WebGPURenderer [<pipeline>/fragment error] at line L:C: ...` and to `renderer.onError` (since r185), not thrown at the call site that built the node graph.

## Verify

- `tw check <page>`: `result: OK` with no console errors. A shader compile error surfaces as a console error naming the pipeline stage and line for WGSL, or a GLSL compile message on the WebGL 2 backend; `tw check` prints a fix hint for the common ones.
- `tw lint <dir>` flags `ShaderMaterial`/`onBeforeCompile` alongside `WebGPURenderer`, `EffectComposer` alongside `WebGPURenderer`, and renamed TSL imports (`tsl-renamed` rule and its companions in `kb/rules/lint-rules.json`).
- `tw check <page> --eval "renderer.backend.isWebGPUBackend"` confirms which backend actually compiled the TSL graph, since the WebGL 2 fallback and the WebGPU backend can render the same TSL material with subtly different results (compute limits, precision).

## Notes

- 2026-09-26: written from the direction research (sections 2.3, 3) and the core r160-r186 research (sections 2, 5, 6) against the installed three 0.186.1 (`src/nodes`, `build/three.tsl.js` imports, `examples/jsm/tsl/`).
