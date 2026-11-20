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
sources: [ai-docs/research/2026-09-26-direction.md, ai-docs/research/2026-09-26-core-r160-r186.md, https://raw.githubusercontent.com/mrdoob/three.js/r186/manual/pages/webgpurenderer.html, https://thebookofshaders.com]
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
- Fragment idioms that port straight to TSL nodes (`step`, `smoothstep`, `fract`, `floor`, `mix`, `atan`, `length`), from The Book of Shaders (thebookofshaders.com, chapters cited): centre coordinates and scale x by width/height before any distance field, or circles stretch on a non-square canvas (ch. 7); draw visible edges with `smoothstep`, not `step` (ch. 7); rotate or scale about the shape's centre: translate it to the origin, transform, translate back, and mind the order, since matrix products do not commute (ch. 8); tile with `floor` for the cell id and `fract` for the local position, then hash the id for per-tile variation (ch. 9); `atan(y, x)` returns -PI..PI, so `atan / TWO_PI + 0.5` gives 0..1 for a hue wheel, and the radius from the centre peaks at 0.5, so double it (ch. 6).
- Debug views for those idioms: plot a curve by lighting pixels near y = f(x) with `smoothstep` (ch. 5); show a distance field's rings with `fract(d * 10.0)` (ch. 7).
- Cellular (Worley, Voronoi) on the GPU: one feature point per cell, search the 3x3 neighbour cells (`floor(p) + offset`, offsets -1..1), and compute in cell-local space (`fract(p)` against the neighbour's point) so precision holds far from the origin; checking only the own cell leaves seams, and a 2x2 search is cheaper but can break at cell borders. Keep the nearest point, not only its distance, to colour regions by id (ch. 12).

## Pitfalls

- Forgetting the `three/webgpu` import-map entry when only `three/tsl` is imported: the page fails to resolve the bare `three/webgpu` specifier that `three.tsl.js` imports internally. Always include both, plus `three/addons/`.
- Importing a post-processing effect function from `three/tsl` or `three/webgpu` directly (`import { bloom } from 'three/tsl'`): effect nodes left core in r170 and now live only in `three/addons/tsl/display/*.js` (`bloom` from `BloomNode.js`, `dof` from `DepthOfFieldNode.js`, `ao` from `GTAONode.js`, and so on).
- Using an invented TSL function name: practitioner reports describe model output with "deprecated imports, phantom functions that don't exist, and compute shaders that compile but render nothing." Check every TSL import against the installed `node_modules/three/src/nodes` or the TSL Guide before writing it from memory.
- Putting `ShaderMaterial`, `RawShaderMaterial` or `.onBeforeCompile` in a file that also constructs `WebGPURenderer`: it silently renders as a default node material with a console error, not a shader error you would notice from the color. `tw lint` flags this combination.
- Elapsed time fed straight into `sin`/`fract` (`sin(uTime * 3.0)`) keeps growing; after hours on an open page float precision drops and motion steps. Wrap it on the CPU or with `mod` by a whole period (Book of Shaders ch. 5). `tw lint` rule `glsl-unwrapped-time` flags the GLSL form.
- Assuming a WGSL error will look like a JS error: WGSL compile errors are reported through `THREE.WebGPURenderer [<pipeline>/fragment error] at line L:C: ...` and to `renderer.onError` (since r185), not thrown at the call site that built the node graph.

## Verify

- `tw check <page>`: `result: OK` with no console errors. A shader compile error surfaces as a console error naming the pipeline stage and line for WGSL, or a GLSL compile message on the WebGL 2 backend; `tw check` prints a fix hint for the common ones.
- `tw lint <dir>` flags `ShaderMaterial`/`onBeforeCompile` alongside `WebGPURenderer`, `EffectComposer` alongside `WebGPURenderer`, and renamed TSL imports (`tsl-renamed` rule and its companions in `kb/rules/lint-rules.json`).
- `tw check <page> --eval "renderer.backend.isWebGPUBackend"` confirms which backend actually compiled the TSL graph, since the WebGL 2 fallback and the WebGPU backend can render the same TSL material with subtly different results (compute limits, precision).

## Notes

- 2026-09-26: written from the direction research (sections 2.3, 3) and the core r160-r186 research (sections 2, 5, 6) against the installed three 0.186.1 (`src/nodes`, `build/three.tsl.js` imports, `examples/jsm/tsl/`).
- 2026-11-19: fragment idioms, debug views, the cellular search rule and the time-wrap pitfall added from The Book of Shaders ch. 5 to 12; formulas checked against the chapter sources on thebookofshaders.com. Lint rules `glsl-float-int-literal`, `glsl-step-visible-edge`, `glsl-unwrapped-time` added.
