# Where three.js is heading, and what to teach as current versus legacy

Date: 2026-09-26
Track: direction (WebGPU reach, the three.js roadmap, TSL, renderer defaults per scenario, current versus legacy teaching rules) for threewright
Status: first pass. Claims marked "unverified" were not confirmed against a primary source. threejs.org, webkit.org, developer.chrome.com, developer.mozilla.org, caniuse.com, discourse.threejs.org and several vendor blogs were blocked for direct fetch here. Where possible their content was read from the source repositories instead (three.js docs, manual and llms files on GitHub, MDN content, the caniuse dataset, the gpuweb wiki). Facts taken only from search result snippets are flagged.

## Summary

- WebGPU reaches 85.72% of global usage fully and 3.05% partially (88.77% total) in the caniuse dataset updated 2026-09-24. It is still not Baseline (web-features: `baseline: false`). Firefox ships it only on Windows (141) and Apple Silicon Macs (147 for all macOS versions). Safari has it since 26.0 (2025-09-15), but only on macOS 26 Tahoe, iOS 26, iPadOS 26 and visionOS 26. About a quarter of iOS Safari usage (iOS 18 and older) has no WebGPU.
- Three.js has not made WebGPURenderer the default. The manual (dev branch, read 2026-09-26) still says the renderer "is still in an experimental state". It says WebGLRenderer "is still maintained and the recommended choice for pure WebGL 2 applications", with "no plans to add larger new features". llms.txt tells agents: "Use WebGLRenderer (default, mature)", and WebGPURenderer for TSL, compute and node materials.
- New work goes to WebGPURenderer and TSL. `webgpu_*` examples grew from 163 (r176) to 231 (dev after r186) while `webgl_*` stayed near 295. TSL display nodes grew from 33 files (r181) to 48 (r186); EffectComposer pass files stayed at 30. VXGI, ClusteredLighting, OIT, SSAONode, DirectRenderPipeline and the native Gaussian splat renderer are WebGPURenderer only. SunLight (r186) is the notable new feature that landed in both renderers.
- TSL is "the new shader standard for Three.js" (TSL Guide). The guide site (threejs.org/tsl/) entered the repo as "Tour of TSL" on 2026-08-28 and was renamed "TSL Guide" on 2026-09-04, just before r186. r184 added a bridge that runs TSL node materials inside WebGLRenderer (`WebGLNodesHandler`, with limits). ShaderMaterial, RawShaderMaterial, onBeforeCompile and EffectComposer do not run on WebGPURenderer.
- Packaging moved on. r186 deprecated CommonJS (`three.cjs` is now a 631 byte `require(esm)` shim that warns) and removed every `.min.js` build. r184 switched the builds to ES2022 syntax (class static blocks), so the floor is Chrome 94, Firefox 93 and Safari 16.4. Types stay in `@types/three` (0.186.0, 2026-09-11). No TypeScript port is planned that we could find.
- Releases slowed: 12 in 2024, 10 in 2025, 4 so far in 2026 (r183 2026-02-18, r184 2026-04-16, r185 2026-06-25, r186 2026-09-08), with gaps of 57 to 75 days. r187 is likely in November 2026 (estimate).
- WebGPURenderer still costs something. A minimal scene bundles to about 205 to 215 KB gzip versus 126 to 133 KB for WebGLRenderer (1.6x). Open issues show slower material initialization (16x to 36x) and CPU-bound draw submission with many unbatched meshes. On compatibility-mode devices three.js turns MSAA off. WebXR on WebGPU works only where `XRGPUBinding` exists (Vision Pro, not Quest). Headless render hosts often have no WebGPU adapter. Popular libraries are still WebGL only (pmndrs postprocessing, troika text, official Spark releases, three-gpu-pathtracer, takram clouds).
- Recommendation: teach TSL, NodeMaterial and RenderPipeline as the forward path. Default to WebGLRenderer for docs charts, product viewers, scroll heroes, XR, video capture, CAD/BIM and geospatial. Default to WebGPURenderer (with its WebGL 2 fallback) for games, generative art and compute-centric work. Split splats by scene size.

---

## 1. WebGPU in browsers, September 2026

### 1.1 Support matrix

Sources: gpuweb Implementation Status wiki (last edit 2026-08-13), caniuse dataset (updated 2026-09-24), MDN Firefox release notes (mdn/content), release dates from the caniuse agent data.

| Browser | Platform | WebGPU on by default | Notes |
| --- | --- | --- | --- |
| Chrome, Edge | Windows x86/x64, macOS, ChromeOS | 113 (2023-05-02) | Edge follows Chromium. |
| Chrome | Android 12+, ARM, Qualcomm and Intel GPUs | 121 (2024-01-23) | Imagination GPUs on Android 16+ since 139 (2025-08-05). Samsung Xclipse "probably 154" per the wiki. Other GPUs TBD. |
| Chrome | Linux | Intel Gen12+ since 144 (2026-01-13); NVIDIA driver 535.183.01+ on Wayland since 147 (2026-04-07) | Other GPUs need `--enable-unsafe-webgpu` and Vulkan flags. |
| Chrome | Windows on ARM64 | No | Behind `--enable-unsafe-webgpu`. |
| Firefox | Windows | 141 (2025-07-22) | MDN: all contexts except service workers. |
| Firefox | macOS, Apple Silicon | 145 (2025-11-11) on macOS 26+; 147 (2026-01-13) on all macOS versions | |
| Firefox | macOS, Intel | No | Nightly only. |
| Firefox | Linux | No | Nightly only. Stable 152 has it behind `dom.webgpu.enabled` (gpuweb issue 6331, 2026-07-09). "Mozilla expects to ship on Linux in 2026." |
| Firefox | Android | No | Behind `gfx.webgpu.ignore-blocklist` in Beta or Nightly. "Mozilla expects to do work on Android in 2026." |
| Safari | macOS | 26.0 (2025-09-15), only on macOS 26 Tahoe | caniuse note: partial, "only being enabled by default on macOS 26 Tahoe or later". |
| Safari | iOS, iPadOS | 26.0 (2025-09-15) | iOS 18 and older: none. |
| Safari | visionOS | 26 | The WebXR/WebGPU binding also ships here (see 4.4). |
| Samsung Internet | Android | 24 (2024-03-27) per caniuse | |

Current stable versions in the caniuse data: Chrome 154 (2026-09-22), Edge 152 (2026-08-27), Firefox 156 (2026-09-15; 157 ships 2026-09-29 per MDN), Safari 27.0 (2026-09-14). Firefox 155 added `dual-source-blending`; Firefox 157 adds the `TRANSIENT_ATTACHMENT` texture usage. Safari 27.0 adds WGSL `clip_distances` and fixes `GPUDevice.onuncapturederror` (WebKit post of 2026-09-17, seen only as a search snippet, unverified).

### 1.2 Share of users

caniuse global usage for WebGPU (dataset updated 2026-09-24):

| Browser | Full support | Partial |
| --- | --- | --- |
| Chrome for Android | 44.02 | |
| Chrome desktop | 23.63 | |
| Safari on iOS (26+) | 9.96 | |
| Edge | 5.08 | |
| Samsung Internet | 1.27 | |
| Opera Mobile | 0.97 | |
| Opera | 0.79 | |
| Safari desktop | | 1.63 |
| Firefox desktop | | 1.42 |
| Total | 85.72 | 3.05 |

- Not supported: iOS Safari 18.x and older (3.24 points, about 25% of all iOS Safari usage), older desktop Safari (0.84), Firefox for Android (0.38), UC and others.
- WebGL 2 reaches 96.44% in the same dataset.
- caniuse counts all Chrome for Android 152 usage as supported. Chrome actually needs Android 12+ and a supported GPU family (gpuweb wiki). Real adapter availability is lower; by how much is unverified.
- PlayCanvas says WebGPU "is now available to roughly 85% of end users" (vendor claim, via a Radiance Fields snippet, 2026).
- web3dsurvey.com measures real adapter success rates but was not reachable here (unverified).

### 1.3 Compatibility mode

- Spec: the gpuweb proposal lists "Status: Merged" with tentative consensus, but its text still says it "has not been standardized" (main branch, read 2026-09-26). Apps call `requestAdapter({ featureLevel: 'compatibility' })`. The `core-features-and-limits` feature lifts all restrictions. Browsers without compat mode return a Core adapter.
- Chrome 146 (stable 2026-03-10) shipped compatibility mode, including an OpenGL ES 3.1 backend on Android. This comes from search snippets of the Chrome 146 WebGPU blog; the blog itself was blocked here. D3D11 on Windows is described as being explored (unverified).
- Restrictions that matter for three.js: no multisampled `rgba16float` or `r32float` textures, 2D textures up to 4096, 4 color attachments, 128 compute invocations per workgroup, 16 KB uniform buffer bindings, no cube array views, no copies from compressed or multisampled textures, no `linear`/`sample` interpolation, no flat interpolation.
- Three.js behavior: since r183 ("Always request compatibility mode and upgrade to core", #32762) `WebGPUBackend` requests `featureLevel: 'compatibility'` and then asks for every feature the adapter has, so Core devices end up in Core. If `core-features-and-limits` is missing it sets `renderer._samples = 0`, which turns MSAA off. It also disables depth texture compare sampling on Android user agents and warns that MRT blending is limited (r186 source).

---

## 2. The three.js project's own direction

### 2.1 What the project says

| Source | Statement (quoted or close) |
| --- | --- |
| Manual, WebGPURenderer page (dev, read 2026-09-26) | "The new WebGPURenderer is the next-generation renderer for three.js." |
| Same page, migration | ShaderMaterial, RawShaderMaterial and `onBeforeCompile()` "are not supported". EffectComposer "is not supported". "All common effects have already been ported." New effects "like SSGI, SSS or a better DoF" exist "exclusively for the new renderer". |
| Same page, maturity | "The renderer itself is still in an experimental state although its maturity level has been greatly improved in the last years." You may "encounter missing features or a better performance with WebGLRenderer". |
| Same page, "State of WebGLRenderer" | "still maintained and the recommended choice for pure WebGL 2 applications", "no plans to add larger new features", "investigating the possibility to add limited node material support to WebGLRenderer" (this shipped in r184, see 3.3). |
| Manual, Post-Processing with WebGPURenderer | "The instance of RenderPipeline replaces the previous instance of EffectComposer." |
| API docs | WebGPURenderer "is the new alternative of WebGLRenderer". RenderPipeline "can only be used with WebGPURenderer". |
| llms.txt (added in r183, #32673) | "Use WebGLRenderer (default, mature)"; use WebGPURenderer "when you need: Custom shaders/materials using TSL, Compute shaders, Advanced node-based materials". "When using WebGPURenderer, use TSL instead of raw GLSL." |
| TSL Guide | "TSL (Three.js Shading Language) is the new shader standard for Three.js." |
| Issue 31381 (Mugen87, 2025-07-07) | Proposed renaming WebGPURenderer to `Renderer` and moving the WebGL renderer to `webgl-legacy`. Closed as not planned. Both names stay. |
| Issue 34386 (mrdoob, 2026-08-27) | mrdoob is personally profiling TSL: "The expensive part isn't the JS node graph, it's the GPU pipeline compile of an oversized WGSL shader". Milestone r187. |
| Official editor (dev) | Default `project/renderer/type` is `WebGLRenderer`, with a WebGL/WebGPU switch. Both use `reversedDepthBuffer: true`. Default tone mapping is Neutral. |

No 2026 statement from mrdoob or sunag setting a date for WebGPURenderer to become the default was found (GitHub, release notes, search snippets). Treat "WebGPURenderer becomes the default" as undated.

### 2.2 What the code says

Where new features landed in r183 to r186:

| Feature (release, PR) | WebGLRenderer | WebGPURenderer |
| --- | --- | --- |
| SunLight with 2 cascaded shadow maps (r186, #34221) | Yes | Yes, after `renderer.library.addLight( SunLightNode, SunLight )` |
| Native Gaussian splats (r186, #33950, #34215, #34284) | No | Yes. The WebGL 2 backend works with a CPU sort. |
| OITPassNode, order independent transparency (r186, #34253) | No | Yes |
| SSAONode (r186, #33921) | SSAOPass, SAOPass, GTAOPass exist | Yes |
| DirectRenderPipeline (r186, #34166) | No | Yes |
| VXGI voxel global illumination (r186) | No | WebGPU backend only |
| ClusteredLighting, Forward+ (r185, #33406) | No | Yes |
| WebXR on WebGPU plus a WebGL fallback (r185, #33583, #33497) | Not applicable | Yes, where `XRGPUBinding` exists |
| TemporalReprojectNode, RecurrentDenoiseNode, SSR denoiser (r185) | No | Yes |
| HTMLTexture (r184, #31233) | Yes | Yes |
| TSL node materials in WebGLRenderer (r184, #32851) | Yes, limited | Native |
| Inspector with timeline, split screen, color grading (r184 to r186) | No | Yes |

Counts from `examples/files.json`:

| Release | `webgpu_*` | `webgl_*` |
| --- | --- | --- |
| r176 (2025-04-23) | 163 | 295 |
| r181 (2025-10-31) | 186 | 292 |
| r184 (2026-04-16) | 203 | 298 |
| dev after r186 | 231 | 299 |

The dev list also has a new "webgl / tsl" category with 4 examples (`webgl_tsl_shadowmap`, `webgl_tsl_skinning`, `webgl_tsl_clearcoat`, `webgl_tsl_instancing`) for the WebGL bridge. All 27 `webxr_*` examples use WebGLRenderer; 4 `webgpu_xr_*` examples use WebGPURenderer.

Patch releases also point at WebGPU. 0.186.1 (2026-09-24) changed only node and WebGPU files: wireframe tracking in `NodeMaterialObserver`, a uniform group fix in `VelocityNode`, context cleanup in `NodeBuilder`, and a geometry dispose leak in `Geometries.js`.

Reading: WebGLRenderer is in "maintained, feature-light" mode, not frozen (SunLight landed there in r186). WebGPURenderer gets nearly all new rendering features.

### 2.3 Packaging, build target, types and docs

- CommonJS: r186 deprecated it (#33891). `build/three.cjs` went from 2,093,053 bytes (0.185.1) to a 631 byte shim. The shim calls `process.emitWarning(...)` with code `THREE_CJS_DEPRECATED` and does `module.exports = require( './three.module.js' )`. That needs `require(esm)`, which is unflagged in Node 20.19.0 and 22.12.0. Tested here on Node 22.22.2: `require('three')` works and prints the warning. Test runners with their own CommonJS loader (for example Jest) may not handle `require(esm)` (unverified).
- Minified builds: r186 removed `three.core.min.js`, `three.module.min.js`, `three.webgpu.min.js`, `three.webgpu.nodes.min.js` and `three.tsl.min.js` (#33893). mrdoob: "jsDelivr minifies on its own". Per the PR summary, direct `.min.js` links on unpkg and cdnjs 404 from r186.
- npm package size: 36.96 MB unpacked (0.184.0), 23.17 MB (0.185.1, fonts, rhino3dm wasm, Draco encoders and ammo removed), 20.44 MB (0.186.0).
- Build target: the Rollup config has no transpile step (only a GLSL minifier and a license header). r184 adopted class static blocks (#33140) and ESLint ECMA 2022 (#33128). `three.core.js` has 6 `static {}` blocks from r184 on. The browser floor is therefore Chrome 94, Firefox 93, Safari 16.4 (BCD), Node 16.11. The `browserslist` field in package.json is not applied to the build. r187 (dev) adds `WeakRef` and `FinalizationRegistry` (#34368).
- TypeScript: the core stays JavaScript. Since r181 JSDoc covers the whole API and generates the docs (English only). Types live in `@types/three`, maintained in three-types/three-ts-types and pushed to DefinitelyTyped. `@types/three` 0.186.0 shipped 2026-09-11, three days after three 0.186.0. No plan to ship types from the `three` package or port to TypeScript was found (unverified absence).
- Docs site: class pages live at `threejs.org/docs/pages/<Name>.html`. Old `#api/en/...` and `#examples/...` hashes redirect only through client-side JavaScript in `docs/index.html`. An agent that fetches without JavaScript gets the index page. llms.txt still links the old `#api/en/...` form.
- TSL documentation: API reference at `docs/pages/TSL.html` (JSDoc). A TSL spec was introduced in r183 (#32601). The TSL Guide at threejs.org/tsl/ comes from `tsl/content/Guide.md` (296 KB): "Tour of TSL" (#34085, sunag, 2026-08-28), playground projects and templates (#34437, 2026-09-04), renamed "TSL Guide" (#34457, mrdoob, 2026-09-04).
- llms files: the repo root `llms.txt` points to `docs/llms.txt` (5.4 KB) and `docs/llms-full.txt` (363 KB). llms-full embeds the full TSL Guide as "TSL (Three.js Shading Language) - Complete Reference". Both pin import maps to `three@0.186.0`, generated from package.json by `utils/llms/build.js`.

### 2.4 Release cadence

Computed from `npm view three time` (registry metadata, modified 2026-09-24):

| Year | Minor releases | Gaps between releases |
| --- | --- | --- |
| 2024 | 12 (r161 to r172) | 26 to 39 days |
| 2025 | 10 (r173 to r182) | 25 to 37 days until r180 (2025-09-03), then 57 (r181, 2025-10-31) and 40 (r182, 2025-12-10) |
| 2026 | 4 so far | r183 2026-02-18 (69 days), r184 2026-04-16 (57), r185 2026-06-25 (69), r186 2026-09-08 (75) |

Patch releases in 2026: 0.183.1 (02-20), 0.183.2 (02-28), 0.185.1 (07-01), 0.186.1 (09-24). The 2026 average gap is about 67 days. No announcement of the slower pace was found (reason unverified). At that pace r187 lands between about 2026-11-04 and 2026-11-22 (estimate). The migration guide says deprecation warnings last 10 releases. At the current pace that is well over a year.

---

## 3. Where TSL is going

### 3.1 Maturity

- The TSL Guide covers syntax, functions, control flow, the compute stage, atomics, storage buffers and textures, uniform groups, lighting and shadows, the render pipeline, MRT, post-processing, MaterialX, noise, context flow, raymarching, and native WGSL and GLSL code with a transpiler.
- The TSL Roadmap issue (#30849, sunag, 2025-04-02) is still open. Its list includes "Improve error handling and validation", "Add LegacyShaderMaterial", "Implement GLSL-to-WGSL transpilation" and "Migration guide". Checkbox states come from a page summary (unverified). The addons already ship a `WGSLEncoder` (present since at least r184), so some GLSL to WGSL translation exists.
- Tooling investment: TSL compile about 3x faster in r184 (#33120). TSL top-level side effects removed for tree shaking in r186 (#34332). GPU unit tests for TSL in r186 (#34331, #34349). mrdoob's performance tracker for r187 (#34386) cuts node counts by up to about half and GPU compile time by about 11 to 18% in its own measurements.

### 3.2 Compute and post-processing nodes

- Compute: `Fn( ... )().compute( count )` with `renderer.compute()`. r186 added `compileComputeAsync()` (#32551) and `updateBefore`/`updateAfter` for compute (#34401). r185 added `storageTexture3D` (#33443) and `textureGather` (#33475). At least 18 `webgpu_compute_*` and TSL compute examples exist (particles, fluid, cloth, birds, water, rasterizer, bitonic sort, reduce).
- Post-processing: `RenderPipeline` (renamed from `PostProcessing` in r183) with `pass( scene, camera )`, MRT and automatic pass merging. r186 added `DirectRenderPipeline`, which applies output transforms in material shaders and skips the intermediate framebuffer. It "is not compatible with materials that sample the framebuffer, such as transmissive materials".
- Display nodes in r186 (48 files): BloomNode, GTAONode, SSAONode (new), SSRNode, SSGINode, SSSNode, TRAANode, TAAUNode, FSR1Node, SMAANode, FXAANode, DepthOfFieldNode, MotionBlur, OutlineNode, OITPassNode (new), DenoiseNode, RecurrentDenoiseNode, TemporalReprojectNode, GodraysNode, LensflareNode, Lut3DNode and others. New since r181: BilateralBlurNode, CRT, FSR1Node, GodraysNode, ImportanceSampledEnvironment, OITPassNode, RecurrentDenoiseNode, RetroPassNode, SSAONode, Shape, SharpenNode, TAAUNode, TemporalReprojectNode, depthAwareBlend, depthAwareBlur, radialBlur. AnamorphicNode was removed (r185).

### 3.3 One shader source for two backends

- TSL compiles to WGSL on the WebGPU backend and to GLSL on the WebGL 2 backend.
- The WebGL 2 backend runs compute through transform feedback. It accepts only a single number as the count (no 2D/3D dispatch, no indirect compute). It errors on subgroup nodes. VXGI refuses the WebGL 2 backend ("can only be used with WebGPURenderer and a WebGPU backend").
- WebGLRenderer bridge (r184): `renderer.setNodesHandler( new WebGLNodesHandler() )` from `three/addons/tsl/WebGLNodesHandler.js` lets WebGLRenderer render node materials "to prepare for migration to WebGPURenderer". Its header lists limits: no VSM shadows, no MRT, no transmission, no WebGPU post-processing stack, no storage textures, fog and environment changes need `dispose`, instanced mesh geometry cannot be shared.

### 3.4 Gaps versus GLSL

- On WebGPURenderer there is no ShaderMaterial, RawShaderMaterial or `onBeforeCompile`. Libraries built on GLSL injection stay WebGL only. Examples: troika-three-text, pmndrs postprocessing and n8ao, three-custom-shader-material (unverified), 3DTilesRendererJS `ImageOverlayPlugin` (error "Material 'ShaderMaterial' is not compatible", issue 1380), takram clouds, three-gpu-pathtracer.
- Escape hatches: `glslFn` (WebGL backend only), `wgslFn` (WebGPU backend only), and the Guide's `glslTFn` pattern, which transpiles GLSL to WGSL at build time with `Transpiler`, `GLSLDecoder` and `WGSLEncoder`. `TSLEncoder` converts GLSL to TSL source for porting. `ShaderToyDecoder` exists for ShaderToy code.
- Weak spots named by the project: error messages and validation (roadmap), and WGSL pipeline compile cost (issue 34386).

### 3.5 Performance, 2026

| Source | Scenario | WebGLRenderer | WebGPURenderer | Status (read 2026-09-26) |
| --- | --- | --- | --- | --- |
| Issue 30560 (2025-02-19) | 20,000 non-instanced cubes, M1 Pro | about 60 fps | about 15 fps | Open, high priority |
| Issue 31055 (2025-05-06) | 3,000 cubes with custom materials | about 10x faster | | Closed as duplicate of 30560 |
| Issue 33821 (2026-06-16) | First render, one material per mesh | about 131 ms | about 2,100 ms | Open |
| Issue 33821 | First render, one shared material | about 28 ms | about 1,029 ms | Open |
| Issue 34386 (mrdoob, 2026-08-27) | 3 lights, shadows, environment | | GPU compile 404 to 333 ms, JS build 48 to 36 ms after fixes | Milestone r187 |
| Issue 34632 (2026-09-22) | `compileAsync` with many textured materials fails with "Binding doesn't exist" | | Bug in r186 | Closed as not planned, milestone r187 |
| PlayCanvas engine (vendor, via Radiance Fields) | 35M Gaussian splats | 13 fps (WebGL 2) | 76 fps (WebGPU compute) | PlayCanvas, not three.js |

Reading: WebGPURenderer wins when work moves to the GPU (compute particles, sorting, culling, simulation). It still loses on CPU-bound scenes with many unique draws and on shader and pipeline compile time. Secondary articles quoting "2 to 10x" or "15x" gains give no reproducible setup (unverified). Profile per scene.

Local observation: threewright's own `templates/html-webgpu/template.json` records that the WebGPU backend of r186 failed on Chromium 141 ("texture view swizzle"). r186's `GPUTextureViewDescriptor` always sets `swizzle = 'rgba'` and documents that it needs the `'texture-component-swizzle'` feature. The root cause is unverified. Pin a current Chrome when testing the WebGPU backend.

### 3.6 Bundle size (measured 2026-09-26, three 0.186.1)

Whole files as served by an import map (gzip -9). The WebGL and WebGPU builds both import the shared `three.core.js`.

| File | Raw bytes | gzip | Minified (esbuild) | Minified gzip |
| --- | --- | --- | --- | --- |
| three.core.js | 1,458,113 | 286,358 | 389,591 | 104,066 |
| three.module.js (WebGLRenderer) | 662,772 | 130,745 | 376,181 | 92,228 |
| three.webgpu.js | 2,284,850 | 443,788 | 720,945 | 200,891 |
| three.webgpu.nodes.js (node materials only) | 2,276,209 | 442,296 | | |
| three.tsl.js | 36,854 | 7,679 | 25,647 | 6,953 |
| WebGL total (core + module) | 2,120,885 | 417,103 | 765,772 | 196,294 |
| WebGPU total (core + webgpu + tsl) | 3,779,817 | 737,825 | 1,136,183 | 311,910 |

For comparison, the minified files shipped in 0.185.1 gzip to 187,457 bytes (WebGL pair) and 285,472 bytes (core plus WebGPU). Real CDNs usually serve brotli, which is smaller.

Tree-shaken minimal scene (box, MeshStandardMaterial, two lights, render loop), minified ESM, gzip -9:

| Bundle | esbuild 0.25.12 | Rollup 4.63.5 + terser |
| --- | --- | --- |
| WebGLRenderer from `three` | 534,029 B, 133,107 gzip | 522,651 B, 125,654 gzip |
| WebGPURenderer from `three/webgpu`, classic material | 787,977 B, 214,792 gzip | 767,198 B, 205,497 gzip |
| WebGPURenderer plus a TSL material, TSL from `three/tsl` | 895,712 B, 245,207 gzip | 875,689 B, 234,833 gzip |
| Same, everything imported from `three/src/...` | 768,573 B, 209,834 gzip | 763,156 B, 204,132 gzip |

- WebGPU costs about 1.6x the gzip size of WebGL for a small scene.
- Importing TSL through `three/tsl` added about 30 KB gzip in both bundlers. `three.tsl.js` re-exports each function as `const x = TSL.x` from a `TSL` namespace object, which likely blocks tree shaking (my inference). Importing from `three/src` avoids it but mixes source and build copies of three if any other module imports `three/webgpu`. Do not recommend that; just budget the 30 KB.

---

## 4. Other directions

### 4.1 Gaussian splats

- r186 ships a native splat renderer in the addons, not in the core build: `three/addons/objects/GaussianSplat.js`, loaders `GaussianSplatPLYLoader`, `SPLATLoader`, `SPZLoader`, `KSPLATLoader`, and `GLTFGaussianSplatLoaderExtension`. It has spherical harmonics, raycasting and a GPU counting sort (`gpgpu/CountingSort.js`).
- It "can only be used with WebGPURenderer". The `forceWebGL` fallback works; WebGLRenderer does not. It calls itself "a minimal renderer"; no LoD or streaming code is in r186.
- Spark 2.2.0 (2026-09-11) stays WebGL 2 only in official releases, with LoD streaming and the .RAD format. A community fork added opt-in WebGPU on 2026-09-25 (search snippet, unverified).
- Competitors moved splats to WebGPU compute: PlayCanvas 2.19.0 (2026-05-28) added a WebGPU compute radix sort and a hybrid raster renderer. SuperSplat Editor 3.0 (September 2026) was rebuilt on WebGPU (CG Channel snippet).

### 4.2 Lighting and shadows

- `SunLight` (r186 addon, `three/addons/lights/SunLight.js`): direction from position, no target, two cascades, 1024x1024 per cascade by default, cascades fitted to the view frustum with a 10% blend. It works in WebGLRenderer. WebGPURenderer needs `renderer.library.addLight( SunLightNode, SunLight )`.
- Older options remain: the `CSM` addon (WebGL) and `CSMShadowNode` (WebGPU) for more cascades.
- `ClusteredLighting` (r185) replaces `TiledLighting` on WebGPURenderer. VXGI (r186) is WebGPU backend only. `LightProbeGrid` is the WebGPU version; the WebGL one was renamed `LightProbeGridWebGL` (r186).
- `PCFShadowMap` is now soft. `PCFSoftShadowMap` was removed from WebGPURenderer (r186). WebGLRenderer r186 maps it to `PCFShadowMap` with the warning "PCFSoftShadowMap has been removed".

### 4.3 Path tracing

- three-gpu-pathtracer 0.0.24 (2026-02-21) takes a `WebGLRenderer`.
- three-mesh-bvh 0.9.15 (2026-09-09) exports `./webgpu` and has a WebGPU compute path tracing demo.
- Three.js has a compute rasterizer and a "nanite-style rasterizer" example (r185, #33605), both WebGPU.

### 4.4 WebXR

- r185 added WebXR with WebGPU (#33583) and a WebGL fallback (#33497). `XRManager` uses `XRGPUBinding` and requires the `webgpu` session feature: "WebGPU XR sessions require the "webgpu" session feature". `setupWebGLXRFallback()` (`three/addons/webxr/WebGLXRFallback.js`) swaps in a WebGL-backend renderer when `XRGPUBinding` is missing.
- Binding support (cabanier, three.js issue 32858, 2026-01-26): "shipping on Apple Vision Pro and experimental on Chrome for Windows and Android XR. It is not implemented on Meta Quest." The WebXR/WebGPU Binding spec is an Editor's Draft.
- r186: MSAA for XR layers (#34120, #34143), XR shadows fix (#34088), transmission in WebXR fix (#34114). r187 (dev): the XR camera takes its matrices from the first sub camera (#34275).
- Ecosystem: IWSDK core 1.0.0-rc.2 (2026-09-24) creates a `WebGLRenderer` (code inspection). All 27 `webxr_*` examples use WebGLRenderer. PlayCanvas 2.19.0 added "WebGPU immersive XR presentation".

### 4.5 AI-related work

- llms.txt and llms-full.txt landed in r183 (#32673). In September 2026 llms-full gained the whole TSL Guide.
- mrdoob closed his editor agent PR (#30761, opened 2025-03-20) on 2026-09-04 with "We live in a different world now". He had wanted to "use the AI that comes with the browser using the Prompt API".
- Several September 2026 commits by mrdoob carry AI coding-assistant co-author trailers (for example #34457, the TSL Guide rename). The project uses agents in its own workflow.
- There is no official three.js MCP server, AGENTS.md or CLAUDE.md in the repo (checked 2026-09-26). Community options: threejs-devtools-mcp, the IWSDK MCP runtime and Needle Inspector (see the scenarios research file).
- 9to5Mac headlined Safari 27 "including MCP support" (2026-09-17). What that is was not verified.

### 4.6 The three.js editor

Default renderer WebGL with a WebGPU switch, `reversedDepthBuffer: true`, Neutral tone mapping by default. r186 added group selection (#34144).

### 4.7 React Three Fiber, drei, postprocessing, Remotion

| Package | Latest (date) | WebGPU story |
| --- | --- | --- |
| @react-three/fiber | 9.8.1 (2026-09-24) | Hosts WebGPURenderer through an async `gl` factory that awaits `renderer.init()` (v9 migration guide: "still a work in progress"). Peer react `>=19 <19.4`. |
| @react-three/fiber v10 | 10.0.0-alpha.5 (2026-09-08); alpha.0 was 2026-01-14 | Entry points `@react-three/fiber` (WebGL plus WebGPU), `/webgpu` (WebGPU only, TSL hooks) and `/legacy` (WebGL only). `state.gl` becomes `state.renderer`. Hooks `useUniforms`, `useNodes`, `useLocalNodes`, `useBuffers`, `useGPUStorage`, `useRenderPipeline` (replaces `usePostProcessing`). WebGPU canvases can share one renderer. Peers: three `>=0.185.0`, react `>=19.0 <19.3`. |
| @react-three/drei | 10.7.9 (2026-09-25); 11.0.0-alpha.7 (2026-09-05) | v11 splits `/core`, `/legacy` (WebGL only), `/webgpu`, `/external`, `/experimental`. "Drei v11 requires R3F v10 ... even for legacy WebGL projects." `Stars` is WebGL only. Issue 2817 (2026-09-02): the story suite ran real WebGPU but discarded 207 validation errors. `Text` is missing from `/webgpu` (search snippet, unverified). |
| postprocessing (pmndrs) | 6.39.5 (2026-09-09), peer three `>= 0.168.0 < 0.187.0` | WebGL only. v7.0.0-beta.16 (2026-02-19) has peer three `< 0.184.0`. No README on main, v7 or dev mentions WebGPU. |
| @react-three/postprocessing | 3.1.2 (2026-09-22) | Wraps postprocessing ^6.36, so WebGL only. |
| Remotion | 4.0.529 (2026-09-25) | `<ThreeWebGPUCanvas>` from `@remotion/three/webgpu` since 4.0.503 (2026-07-31), marked experimental: "Three.js currently considers its WebGPU renderer experimental." Remotion 4 needs `--gl=angle`; without a GPU, `swangle` is the default on Lambda and Cloud Run. |

### 4.8 What three.js users compare against

- Babylon.js 9.0.0 (2026-03-26; 9.28.0 on 2026-09-24): clustered lighting on WebGPU and WebGL 2, volumetric lighting using WebGPU compute, Frame Graph v1, advanced Gaussian splats, 3D Tiles and geospatial camera, physically based atmosphere, OpenPBR alpha, Inspector v2, SDF text. It targets WebGPU where available with WebGL 2 fallbacks (search snippets and release page).
- PlayCanvas 2.22.4 (2026-09-23): compute WebGPU splat renderer, SOG streaming with LOD, `KHR_gaussian_splatting` and SPZ (2.21.0, 2026-07-21), multisampled render targets on WebGPU (2.22.0, 2026-09-04), WebGPU XR presentation (2.19.0).
- Takeaway: rivals ship WebGPU-first features with batteries included (frame graph, splat streaming, editors). Three.js answers with TSL, compute and the node post stack, but keeps WebGLRenderer as the conservative default.

### 4.9 Wrong claims in circulation

Agents will meet these in search results. threewright should correct them.

| Claim | Seen in | What primary sources say |
| --- | --- | --- |
| "WebGPU is Baseline in every major browser" | VR.org (2026) | web-features: `baseline: false`. Firefox lacks Linux, Android and Intel Macs. |
| "r171 (September 2025) made WebGPURenderer production ready" | Utsubo, VR.org | r171 shipped 2024-11-29 (npm). It added the `three/webgpu` and `three/tsl` entry points. The manual still says "experimental" in September 2026. |
| "Swap renderers with a one line change, no port required" | VR.org | ShaderMaterial, RawShaderMaterial, `onBeforeCompile` and EffectComposer do not run on WebGPURenderer (manual). |
| "Quest Browser exposes WebXR through WebGPU" | VR.org | "It is not implemented on Meta Quest" (three.js issue 32858, 2026-01-26). |
| "r160 shipped February 28, 2026 with a production-ready WebGPU renderer" | Digital Strategy Force | r160 shipped 2023-12-22 (npm). |
| "WebGPU has about 70% browser support" | byteiota (2026) | An October 2024 figure. caniuse on 2026-09-24: 85.72% full plus 3.05% partial. |

---

## 5. Renderer decision table (September 2026)

"WebGPURenderer" always means WebGPURenderer with its automatic WebGL 2 fallback.

| Scenario | Default | Why | Flip to the other when |
| --- | --- | --- | --- |
| 3D chart in docs | WebGLRenderer | Smallest bundle (126 to 133 KB gzip for a minimal scene versus 205 to 215 KB). Synchronous start. Renders under SwiftShader in headless doc builds and screenshot tests. 96.44% WebGL 2 reach. MSAA on every device. | The chart needs GPU compute over very large data (binning, force layout), or many canvases should share one GPU device. Then use WebGPURenderer and test the fallback. |
| Product viewer | WebGLRenderer (or model-viewer, which is built on it) | MSAA everywhere; compat-mode WebGPU turns it off. Same PBR look on both renderers. Faster first frame. AR (USDZ, Scene Viewer) does not depend on the renderer. | Desktop-first premium visuals need the node post stack (TRAA, SSR, SSGI, SSAONode, OIT for glass), or the brand already has a TSL material library. |
| Scroll hero | WebGLRenderer | LCP and bundle budget. WebGPU material init and pipeline compile can hitch mid-scroll (issue 33821). A quarter of iOS Safari usage gets the WebGL 2 fallback anyway. Most scroll stacks and pmndrs postprocessing are WebGL. | The effect is compute driven (GPU particles, fluid) or written in TSL. Then use WebGPURenderer, `compileAsync` everything before reveal, and check the fallback frame. |
| Game (browser, not XR) | WebGPURenderer | New features land only there: ClusteredLighting, OIT, SSGI, TRAA, compute particles, VXGI. TSL survives later changes. A game lives long enough to pay the port cost now. SunLight works on both. | The target includes Quest VR. Thousands of unique unbatched meshes are CPU bound (issue 30560). The game depends on WebGL-only libraries (pmndrs postprocessing, troika text). MSAA is required on low-end Android. |
| Generative art | WebGPURenderer + TSL | TSL is "the new shader standard". Compute for simulations. The TSL Guide playground. One source runs on WebGPU and WebGL 2. | Output must be identical across viewers, or the platform captures previews headless without a GPU. Then pin `forceWebGL: true` (same TSL) or use WebGLRenderer with GLSL. |
| XR | WebGLRenderer | No WebXR/WebGPU binding on Quest. All 27 `webxr_*` examples, IWSDK 1.0.0-rc.2 and @react-three/xr build on WebGLRenderer. Foveation and multiview are mature there. | Vision Pro only (the binding ships in visionOS Safari). Or WebGPU features are required and the r185 WebGL XR fallback swap on Quest is acceptable. |
| Video capture (Remotion, frame export, CI renders) | WebGLRenderer | Render hosts often have no WebGPU adapter (SwiftShader gives WebGL but no WebGPU adapter per threewright's own `tw doctor`; Remotion uses software `swangle` on Lambda and Cloud Run). WebGPURenderer then silently runs on WebGL 2 and pixels change. WebGL readback is synchronous with `preserveDrawingBuffer`. | GPU render hosts with a verified WebGPU adapter, and visuals that need TSL compute. Assert `renderer.backend.isWebGPUBackend` at startup and fail the job if false. |
| CAD/BIM | WebGLRenderer | That Open components 3.4.8 renders with WebGLRenderer. Many unique meshes and materials (WebGPU init is 16x to 36x slower in issue 33821). Clipping and precise picking are mature. | GPU-driven culling or indirect draws at huge scale, or the BIM toolkit moves to WebGPU. First try That Open's pattern: WebGLRenderer for display plus a separate WebGPURenderer as a compute sidecar (it does this for edge computation). |
| Geospatial | WebGLRenderer | MapLibre custom layers share a WebGL context. 3DTilesRendererJS core works on WebGPU but `ImageOverlayPlugin` does not (issue 1380, open). takram clouds are WebGL only. | A standalone globe without MapLibre, using takram's `@takram/three-atmosphere/webgpu` entry and no WebGL-only plugins. |
| Gaussian splats | Split by scene: Spark 2.2 on WebGLRenderer for large or streamed scenes; r186 `GaussianSplat` on WebGPURenderer for small to medium scenes | Spark has LoD streaming, .RAD and paging, and runs on WebGL 2 everywhere. The native addon is "a minimal renderer" with a GPU sort and no LoD. | Splats must mix with TSL materials, OIT or node post: use the native addon. Revisit when Spark ships official WebGPU support. |

### Risks to teach with the table

1. Headless capture of WebGPU. `navigator.gpu` can be missing or `requestAdapter()` can return null on GPU-less CI. WebGPU needs a secure context (`http://localhost`, not `about:blank`). Puppeteer injects `--use-angle=swiftshader-webgl`, which overrides Vulkan flags. SwiftShader's Vulkan path needs the Vulkan loader and a Mesa ICD. Dawn keeps its own blocklist. (Search snippets from 2026 CI write-ups, unverified in detail.) WebGPURenderer hides all of this by falling back to WebGL 2, so always log the backend.
2. Compatibility mode. On devices that only reach compat mode (Chrome 146+ on Android GLES 3.1), three.js turns MSAA off and limits MRT blending. Textures above 4096 fail. Add a post AA node (FXAA, SMAA or TRAA) when `renderer.backend.compatibilityMode` is true.
3. Older Apple devices. iOS and iPadOS 18 and older have no WebGPU (3.24% of global usage). Safari 26 on macOS 15 or older has no WebGPU. Firefox has none on Intel Macs, Linux or Android. The WebGL 2 fallback covers them, but WebGPU-backend-only features (VXGI, subgroups, multi-dimensional or indirect compute) do not run there.
4. WebGL-only extensions. pmndrs postprocessing, @react-three/postprocessing, n8ao, troika-three-text, three-custom-shader-material (unverified), three-gpu-pathtracer, takram clouds, 3DTilesRendererJS `ImageOverlayPlugin`, official Spark releases, drei `Stars`. Any library that uses ShaderMaterial or `onBeforeCompile` will fail on WebGPURenderer with "Material 'ShaderMaterial' is not compatible".
5. Performance traps. Many unbatched meshes, many material instances, and first-use pipeline compiles. Use InstancedMesh or BatchedMesh, share materials, and precompile with `compileAsync`. Watch r186 issue 34632 for `compileAsync`.
6. Maturity signals. The manual says "experimental". Remotion marks WebGPU experimental. R3F v10 and drei v11 are alpha. A WebGPU choice needs a tested fallback path, not a promise.
7. Browser version floor. r184+ needs ES2022 (Safari 16.4+). The r186 WebGPU backend failed on Chromium 141 in threewright's own check (root cause unverified). Electron apps and pinned CI browsers can be older than you think.

---

## 6. Current versus legacy

### 6.1 The rule

- Current: works in r186 without a deprecation warning. Label it by renderer: "both", "WebGL path" or "WebGPU path".
- WebGL path (current, feature-light): WebGLRenderer, EffectComposer and passes, ShaderMaterial, RawShaderMaterial, `onBeforeCompile`, the `CSM` addon. Teach them for WebGL scenarios. Do not call them legacy. Say that new features land on the WebGPU path.
- Legacy: removed or deprecated. Show only in a "migrating from rN" note with the release numbers below. Never generate it for new code.

### 6.2 Current patterns in r186

| Area | Current pattern | Renderer | Since |
| --- | --- | --- | --- |
| Loading | ES modules. npm plus Vite, or an import map with an exact version on jsDelivr. For WebGPU, map both `three` and `three/webgpu` to `three.webgpu.js`, plus `three/tsl`. | both | import maps required since r137; `three/webgpu` and `three/tsl` since r171 |
| Renderer setup | `new WebGLRenderer()`; or `new WebGPURenderer()` plus `await renderer.init()` (or `setAnimationLoop`, which initializes) before PMREM, compute or sync calls | both | sync-after-init rule since r181 |
| Frame loop | `renderer.setAnimationLoop( fn )` plus `THREE.Timer` | both | Timer in core since r179 |
| Custom materials | NodeMaterial classes (`MeshStandardNodeMaterial` and others) with TSL (`colorNode`, `positionNode`, `emissiveNode`) | WebGPU path; WebGL via `WebGLNodesHandler` (limited) | TSL entry r171; bridge r184 |
| Custom materials on WebGL | ShaderMaterial or `onBeforeCompile` | WebGL path | long standing |
| Post-processing | `RenderPipeline` plus `pass()` plus TSL display nodes; `DirectRenderPipeline` when no transmission | WebGPU path | RenderPipeline name r183; Direct r186 |
| Post-processing on WebGL | EffectComposer with `OutputPass` last | WebGL path | long standing |
| Compute | `Fn( ... )().compute( n )`, `renderer.compute()`, `compileComputeAsync()` | WebGPU path (WebGL 2 backend emulates 1D compute) | `compileComputeAsync` r186 |
| Color | `outputColorSpace` defaults to `SRGBColorSpace`; set `texture.colorSpace = SRGBColorSpace` on color textures; ColorManagement on by default | both | r152 |
| Lights | Physical light units only; SunLight addon for big outdoor scenes | both | legacy mode removed r165; SunLight r186 |
| Shadows | `PCFShadowMap` (now soft) or `VSMShadowMap` | both | soft PCF r182 |
| Environment | `PMREMGenerator`, `RoomEnvironment`, `HDRLoader`, `UltraHDRLoader`, `EXRLoader` | both | HDRLoader name r180 |
| Render targets | `RenderTarget` with `count` for MRT; `CubeRenderTarget` on WebGPU | both | `count` r162; CubeRenderTarget rule r183 |
| Many objects | `InstancedMesh`, `BatchedMesh` | both | |
| Splats | `GaussianSplat` plus loaders (WebGPU path) or Spark (WebGL path) | split | r186 |
| Scene lifetime | `Object3D.dispose()`; call `super.dispose()` in subclasses | both | r186 |
| Debugging | Inspector (`three/addons/inspector/Inspector.js`) | WebGPU path | r184 to r186 |
| XR | `renderer.xr` with XRButton or VRButton; WebGPU XR with the `webgpu` session feature plus `setupWebGLXRFallback` | both | WebGPU XR r185 |
| Porting GLSL | `Transpiler` with `GLSLDecoder` and `TSLEncoder` or `WGSLEncoder` | WebGPU path | present by r184 |

### 6.3 Legacy: present only for old versions

"Last recommended" is the last release where the pattern was still the normal way (the release before deprecation or replacement).

| Legacy pattern | Replacement | Changed | Last recommended |
| --- | --- | --- | --- |
| `Geometry`, `Face3` | `BufferGeometry` | removed r125 (2021-01-27) | r124 |
| `examples/js` global addons | `examples/jsm` ES modules | removed r148 (2022-12-22) | r147 |
| `build/three.js`, `build/three.min.js`, `THREE` global | ES modules | deprecated r150; files still shipped in r160; gone in r161 (tarballs checked) | r149 |
| `physicallyCorrectLights`, `useLegacyLights` | physical units only | renamed r150; default false r155; removed r165 (tarballs checked) | r154 |
| `mergeBufferGeometries()` | `mergeGeometries()` | r151 | r150 |
| `outputEncoding`, `texture.encoding`, `sRGBEncoding`, `LinearEncoding` | `outputColorSpace`, `texture.colorSpace`, `SRGBColorSpace`, `LinearSRGBColorSpace` | replaced r152 (2023-04-27); constants gone in r162 (tarballs checked) | r151 |
| WebGL 1, `WebGL1Renderer` | WebGLRenderer (WebGL 2) | deprecated r153; removed r163 (2024-03-29) | r152 |
| `WebGLMultipleRenderTargets` | render target `count` | removed r162 | r161 |
| `USDZLoader` | `USDLoader` | deprecated r179 | r178 |
| `TRAAPassNode`; TSL `label()` | `TRAANode`; `setName()` | r179 | r178 |
| `RGBELoader`; `RGBMLoader` | `HDRLoader`; EXR, HDR or UltraHDR | renamed and removed r180 | r179 |
| `renderAsync()`, `computeAsync()`, `clearAsync()`, `hasFeatureAsync()` | `await renderer.init()` then sync calls | deprecated r181 | r180 |
| `waitForGPU()`; `KTX2Loader.detectSupportAsync()`; TSL `PI2` | removed; `detectSupport()` after init; `TWO_PI` | r181 | r180 |
| `PCFSoftShadowMap` | `PCFShadowMap` | deprecated on WebGL r182; removed on WebGPU r186; WebGL r186 remaps with a warning | r181 |
| `colorBufferType` | `outputBufferType` | r182 | r181 |
| `Clock` | `Timer` | deprecated r183 | r182 |
| `PostProcessing` | `RenderPipeline` | renamed r183 | r182 |
| `WebGLCubeRenderTarget` with WebGPURenderer | `CubeRenderTarget` | r183 | r182 |
| `MeshPostProcessingMaterial` | none | removed r183 | r182 |
| `AnamorphicNode`; `TiledLighting` | `BloomNode`; `ClusteredLighting` | removed r185 | r184 |
| TSL `directionToColor()`, `colorToDirection()` | `packNormalToRGB()`, `unpackRGBToNormal()` | r185 | r184 |
| GLSL chunk `inverseTransformDirection()` | `transformNormalByInverseViewMatrix()`, `transformDirectionByInverseViewMatrix()` | deprecated r185 | r184 |
| `require('three')` | `import * as THREE from 'three'` | deprecated r186 (shim) | r185 |
| `three.module.min.js` and other `.min.js` files | a bundler, or jsDelivr's own minification | removed r186 | r185 |
| `Source`; `LightProbeGrid` for WebGL | `TextureSource`; `LightProbeGridWebGL` | r186 | r185 |
| `GTAONode` `distanceExponent`, `distanceFallOff` | no effect now | r186 | r185 |
| `CubeUVReflectionMapping` (PMREM internals) | cube render target PMREM | removed in r187 dev (#34585) | r186 |
| EffectComposer, ShaderMaterial, `onBeforeCompile` for WebGPU targets | RenderPipeline and TSL | never supported on WebGPURenderer | Still current on the WebGL path |

---

## Implications for threewright

**Renderer defaults per scenario (templates).**
- WebGL templates: html-importmap (exists), chart-3d-scatter, surface, globe, product-viewer, scroll-hero, video-turntable, a WebXR starter, a CAD/BIM viewer, and the Spark splat variant.
- WebGPU templates (with fallback): html-webgpu (exists), game-starter, generative art (TSL plus compute), and the native r186 splat viewer.
- r3f template: stay on R3F 9.8.x with WebGLRenderer by default. Add a WebGPU variant using the async `gl` factory. Mention v10 `/webgpu` only as alpha.

**What every template should use.**
- Pin `three@0.186.1` exactly. Use jsDelivr non-minified paths in import maps (as now), never unpkg or cdnjs `.min.js`.
- WebGPU templates: map both `three` and `three/webgpu` to `three.webgpu.js`, as html-webgpu already does. `await renderer.init()` before PMREM and compute. Log `renderer.backend.isWebGPUBackend` and `renderer.backend.compatibilityMode` once. Support `?webgl` to set `forceWebGL: true` so tests can hit the fallback. Precompile with `compileAsync` before the first visible frame. Add an FXAA or SMAA node when compat mode disabled MSAA.
- Use `Timer`, `setAnimationLoop`, `RenderPipeline` (WebGPU) or `EffectComposer` plus `OutputPass` (WebGL), `HDRLoader`, and `PCFShadowMap`.
- Record the browser version in each `template.json` "verified" entry. The WebGPU backend result depends on it.

**Teaching rule for the KB.**
- Add `renderer: webgl | webgpu | both` to KB frontmatter, next to the planned `status: current | legacy` and `applies_to`.
- Put the section 5 decision table in `kb/topics/renderer-choice.md`. Put the section 1 matrix with dates in `kb/topics/webgpu-support.md`. Put the section 6 tables in `kb/rules/legacy-map.md`. Put measured sizes in `kb/topics/bundle-size.md`. Put the section 4.9 corrections in `kb/topics/misinformation.md`.
- TSL topics: link to Guide sections (Compute Stage, Post-Processing, MRT, Transpiler) instead of copying them. Tell agents to fetch llms-full.txt sections, never the whole 363 KB file.
- Docs links: always use `threejs.org/docs/pages/<Name>.html`. Old `#api/en/...` links only redirect with JavaScript.

**tw CLI and lint.**
- `tw check`: print the active backend and compat mode. Warn when a page imports `three/webgpu` but ran on WebGL 2 ("silent fallback").
- New lint ideas: `webgl-only-lib-on-webgpu` (imports of postprocessing, @react-three/postprocessing, troika-three-text, three-custom-shader-material, three-gpu-pathtracer or n8ao next to `three/webgpu`), `legacy-docs-url` (`docs/#api/`), `xr-webgpu-quest` (WebGPURenderer plus `renderer.xr` without `setupWebGLXRFallback`), and an info-level note on the about 30 KB gzip cost of `three/tsl`.
- Fix a small inaccuracy: the existing `umd-build` rule says the UMD builds were removed in r160. The 0.160.0 tarball still ships `build/three.js` and `build/three.min.js`; 0.161.0 does not.

**Tests.**
- Run WebGPU templates twice in CI: WebGPU backend where an adapter exists, then `forceWebGL`. Compare screenshots with a tolerance.
- Keep the WebGL templates as the SwiftShader baseline. SwiftShader has no WebGPU adapter.

## Claims likely to change

| Claim | How soon |
| --- | --- |
| r187 contents: cube-based PMREM, `CubeUVReflectionMapping` removal, `WeakRef` cleanup, TSL compile fixes, XR camera change, `setViewport`/`setScissor` semantics with render targets | r187, about November 2026 |
| Manual "experimental" wording and the llms.txt "default" line | Any release; check every release |
| The WebGPU performance issues (30560, 33821, 34632) | Weeks to months |
| Removal of the `three.cjs` shim | Unannounced; the 10-release deprecation window points to about r196 (unverified) |
| Firefox WebGPU on Linux (Mozilla target 2026), Android and Intel Macs | Linux within months; Android likely 2027 (estimate) |
| Chrome WebGPU on Samsung Xclipse ("probably 154") and compat mode on D3D11 | Weeks to months |
| WebXR/WebGPU binding on Quest | Unknown |
| caniuse share (88.77% on 2026-09-24) | Monthly |
| R3F v10 and drei v11 leaving alpha; pmndrs postprocessing on WebGPU | Unknown; alphas since 2026-01 |
| Spark official WebGPU; takram clouds WebGPU; 3DTilesRendererJS `ImageOverlayPlugin` | Months |
| Safari 27.x WebGPU fixes and what "MCP support" means | Safari point releases, roughly every 1 to 2 months |
| Remotion 5.0 automatic GL selection | Unannounced |
| Release cadence (57 to 75 days in 2026) | Each release |

## Search plan for next refresh

1. `curl https://registry.npmjs.org/three` for dist-tags and times; diff the new tarball's `build/` and `src/` against the last one (min files, cjs shim, new addons).
2. Raw migration guide: `https://raw.githubusercontent.com/wiki/mrdoob/three.js/Migration-Guide.md` (read the newest `N to N+1` sections).
3. Raw manual pages `manual/pages/webgpurenderer.html` and `webgpu-postprocessing.html`; raw `docs/llms.txt` and `utils/llms/build.js` for the default-renderer line.
4. Raw `examples/files.json`: recount `webgpu_*`, `webgl_*` and `webxr_*`, and the renderer used by XR examples.
5. GitHub release notes for r187 and later; issues 30560, 33821, 34386, 34632, 30849 and 31381.
6. gpuweb wiki raw `Implementation-Status.md`; caniuse raw `fulldata-json/data-2.0.json` (recompute the share); web-features `features/webgpu.yml.dist` (Baseline status).
7. mdn/content Firefox release notes for new versions (grep "WebGPU"); WebKit Safari 27.x posts; Chrome "What's New in WebGPU" posts (compat mode on D3D11, Linux GPUs).
8. gpuweb `proposals/compatibility-mode.md`; immersive-web WebXR-WebGPU-Binding status; three.js XR issues.
9. pmndrs: R3F `v10` CHANGELOG, drei `v11-working` migration doc, postprocessing README and peer ranges.
10. Spark releases; takram npm exports; 3DTilesRendererJS issue 1380; That Open and IWSDK npm code (which renderer they construct); three-gpu-pathtracer and three-mesh-bvh READMEs.
11. Remotion docs in `remotion-dev/remotion/packages/docs/docs/` (three-webgpu-canvas, webgl).
12. Babylon.js and PlayCanvas GitHub releases and npm versions.
13. Re-run the esbuild and Rollup bundle measurements with the new version.
14. Search terms: "WebGPURenderer default", "three.js r187", "WebGPU Baseline", "Quest Browser WebGPU XR", "Firefox WebGPU Linux", "three.js TSL roadmap".

## Sources (URL plus date)

1. npm registry, three metadata, https://registry.npmjs.org/three (modified 2026-09-24; accessed 2026-09-26)
2. three tarballs 0.147.0, 0.148.0, 0.159.0 to 0.165.0, 0.178.0 to 0.186.1, https://registry.npmjs.org/three/-/three-0.186.1.tgz and siblings (accessed 2026-09-26)
3. Local install of three 0.186.1, /home/user/threewright/node_modules/three (build, src, examples/jsm; inspected 2026-09-26)
4. three.js Migration Guide (raw wiki), https://raw.githubusercontent.com/wiki/mrdoob/three.js/Migration-Guide.md (accessed 2026-09-26)
5. Manual, WebGPURenderer, https://github.com/mrdoob/three.js/blob/dev/manual/pages/webgpurenderer.html (served at https://threejs.org/manual/#en/webgpurenderer; accessed 2026-09-26)
6. Manual, Post-Processing with WebGPURenderer, https://github.com/mrdoob/three.js/blob/dev/manual/pages/webgpu-postprocessing.html (accessed 2026-09-26)
7. Manual, Installation, https://github.com/mrdoob/three.js/blob/dev/manual/pages/installation.html (accessed 2026-09-26)
8. llms.txt, https://github.com/mrdoob/three.js/blob/dev/docs/llms.txt and root https://github.com/mrdoob/three.js/blob/dev/llms.txt (served at https://threejs.org/docs/llms.txt; accessed 2026-09-26)
9. llms-full.txt, https://github.com/mrdoob/three.js/blob/dev/docs/llms-full.txt (accessed 2026-09-26)
10. llms build script, https://github.com/mrdoob/three.js/blob/dev/utils/llms/build.js (accessed 2026-09-26)
11. TSL Guide source, https://github.com/mrdoob/three.js/blob/dev/tsl/content/Guide.md (site https://threejs.org/tsl/; accessed 2026-09-26)
12. TSL folder history, https://github.com/mrdoob/three.js/commits/dev/tsl (commits 2026-08-28 to 2026-09-17; accessed 2026-09-26)
13. PR 34457, TSL Guide rename, https://github.com/mrdoob/three.js/pull/34457 (merged 2026-09-04)
14. API docs pages WebGPURenderer, WebGLRenderer, RenderPipeline, TSL, https://github.com/mrdoob/three.js/tree/dev/docs/pages (accessed 2026-09-26)
15. Docs index legacy URL handling, https://github.com/mrdoob/three.js/blob/dev/docs/index.html (accessed 2026-09-26)
16. Examples list at dev, r184, r181, r176, https://github.com/mrdoob/three.js/blob/dev/examples/files.json (accessed 2026-09-26)
17. Build config, https://github.com/mrdoob/three.js/blob/dev/utils/build/rollup.config.js (accessed 2026-09-26)
18. Release r186, https://github.com/mrdoob/three.js/releases/tag/r186 (npm 0.186.0 on 2026-09-08, 0.186.1 on 2026-09-24)
19. Release r185, https://github.com/mrdoob/three.js/releases/tag/r185 (npm 2026-06-25)
20. Release r184, https://github.com/mrdoob/three.js/releases/tag/r184 (npm 2026-04-16)
21. Release r183, https://github.com/mrdoob/three.js/releases/tag/r183 (npm 2026-02-18)
22. PR 33891, deprecate CommonJS build, https://github.com/mrdoob/three.js/pull/33891 (2026)
23. PR 33893, remove minified builds, https://github.com/mrdoob/three.js/pull/33893 (2026-06-28 comment)
24. Issue 31381, rename WebGPURenderer to Renderer, https://github.com/mrdoob/three.js/issues/31381 (2025-07-07; closed not planned)
25. Issue 30185, WebGLRenderer node materials, https://github.com/mrdoob/three.js/issues/30185 (2024-12-22; milestone r184)
26. Issue 30849, TSL Roadmap, https://github.com/mrdoob/three.js/issues/30849 (2025-04-02; open)
27. Issue 34386, TSL performance optimizations, https://github.com/mrdoob/three.js/issues/34386 (2026-08-27)
28. Issue 30560, UBO performance with many render items, https://github.com/mrdoob/three.js/issues/30560 (2025-02-19)
29. Issue 31055, WebGPU slower than WebGL, https://github.com/mrdoob/three.js/issues/31055 (2025-05-06)
30. Issue 33821, material initialization slow, https://github.com/mrdoob/three.js/issues/33821 (2026-06-16)
31. Issue 34632, compileAsync binding error in r186, https://github.com/mrdoob/three.js/issues/34632 (2026-09-22)
32. Issue 32858, WebGPU on WebXR, https://github.com/mrdoob/three.js/issues/32858 (2026-01-26)
33. PR 30761, editor agent, https://github.com/mrdoob/three.js/pull/30761 (2025-03-20 to 2026-09-04)
34. PR 29942, WebGPURenderer backwards compatibility test, https://github.com/mrdoob/three.js/pull/29942 (2024-11-22; closed 2026-05-09)
35. Editor config and renderer panel, https://github.com/mrdoob/three.js/blob/dev/editor/js/Config.js and https://github.com/mrdoob/three.js/blob/dev/editor/js/Sidebar.Project.Renderer.js (accessed 2026-09-26)
36. gpuweb Implementation Status, https://github.com/gpuweb/gpuweb/wiki/Implementation-Status (last edit 2026-08-13; accessed 2026-09-26)
37. gpuweb issue 6331, Firefox 152 on Linux behind a flag, https://github.com/gpuweb/gpuweb/issues/6331 (2026-07-09)
38. WebGPU Compatibility Mode proposal, https://github.com/gpuweb/gpuweb/blob/main/proposals/compatibility-mode.md (accessed 2026-09-26)
39. caniuse dataset, https://raw.githubusercontent.com/Fyrd/caniuse/main/fulldata-json/data-2.0.json and https://github.com/Fyrd/caniuse/blob/main/features-json/webgpu.json (updated 2026-09-24; human page https://caniuse.com/webgpu)
40. web-features WebGPU, https://github.com/web-platform-dx/web-features/blob/main/features/webgpu.yml.dist (accessed 2026-09-26)
41. MDN Firefox release notes 141, 147, 155, 157, https://github.com/mdn/content/tree/main/files/en-us/mozilla/firefox/releases (accessed 2026-09-26)
42. MDN browser-compat-data, class static initialization blocks, https://github.com/mdn/browser-compat-data/blob/main/javascript/classes.json (accessed 2026-09-26)
43. WebKit, Safari 26.0 features, https://webkit.org/blog/17333/webkit-features-in-safari-26-0/ (2025; via search, not fetched)
44. WebKit, Safari 27.0 features, https://webkit.org/blog/18325/webkit-features-for-safari-27-0/ (2026-09-17; via search snippet, not fetched)
45. 9to5Mac, Safari 27 for developers, https://9to5mac.com/2026/09/17/webkit-blog-breaks-down-whats-new-with-safari-27-for-developers-including-mcp-support/ (2026-09-17; headline only)
46. Chrome, What's New in WebGPU (Chrome 146), https://developer.chrome.com/blog/new-in-webgpu-146 (2026; via search snippet, not fetched)
47. Node.js 22.12.0 and 20.19.0 release notes (require(esm) unflagged), https://nodejs.org/en/blog/release/v22.12.0 and https://nodejs.org/en/blog/release/v20.19.0 (via search)
48. @types/three on npm, https://registry.npmjs.org/@types/three (0.186.0 on 2026-09-11)
49. three-ts-types, https://github.com/three-types/three-ts-types (accessed 2026-09-26)
50. R3F v10 changelog, https://github.com/pmndrs/react-three-fiber/blob/v10/packages/fiber/CHANGELOG.md (alpha.5 on 2026-09-08)
51. R3F releases, https://github.com/pmndrs/react-three-fiber/releases (9.8.1 on 2026-09-24)
52. R3F v9 migration guide, WebGPU section, https://github.com/pmndrs/react-three-fiber/blob/master/docs/tutorials/v9-migration-guide.mdx (accessed 2026-09-26)
53. drei v10 to v11 migration, https://github.com/pmndrs/drei/blob/v11-working/devDocs/MIGRATION_V10_TO_V11.md (accessed 2026-09-26)
54. drei issue 2817, WebGPU validation errors, https://github.com/pmndrs/drei/issues/2817 (2026-09-02)
55. postprocessing on npm and GitHub, https://www.npmjs.com/package/postprocessing and https://github.com/pmndrs/postprocessing (6.39.5 on 2026-09-09)
56. Spark releases, https://github.com/sparkjsdev/spark/releases (2.2.0 on 2026-09-11)
57. Remotion docs, three-webgpu-canvas and webgl, https://github.com/remotion-dev/remotion/tree/main/packages/docs/docs (accessed 2026-09-26; 4.0.503 on 2026-07-31)
58. 3DTilesRendererJS issue 1380, https://github.com/NASA-AMMOS/3DTilesRendererJS/issues/1380 (2025-11-25)
59. takram three-atmosphere and three-clouds on npm, https://registry.npmjs.org/@takram/three-atmosphere and https://registry.npmjs.org/@takram/three-clouds (0.19.1 and 0.7.6 on 2026-05-06)
60. @thatopen/components 3.4.8 package code, https://registry.npmjs.org/@thatopen/components (2026-07-24)
61. @iwsdk/core 1.0.0-rc.2 package code, https://registry.npmjs.org/@iwsdk/core (2026-09-24)
62. three-gpu-pathtracer on npm, https://registry.npmjs.org/three-gpu-pathtracer (0.0.24 on 2026-02-21)
63. three-mesh-bvh README, https://github.com/gkjohnson/three-mesh-bvh (0.9.15 on 2026-09-09)
64. WebXR/WebGPU Binding spec source, https://github.com/immersive-web/WebXR-WebGPU-Binding (Status: ED; accessed 2026-09-26)
65. Babylon.js 9.0.0 release, https://github.com/BabylonJS/Babylon.js/releases/tag/9.0.0 (2026-03-26)
66. Windows Developer Blog, Announcing Babylon.js 9.0, https://blogs.windows.com/windowsdeveloper/2026/03/26/announcing-babylon-js-9-0/ (2026-03-26; via search)
67. PlayCanvas engine releases, https://github.com/playcanvas/engine/releases (2.19.0 on 2026-05-28; 2.22.4 on 2026-09-23)
68. Radiance Fields, SuperSplat compute WebGPU rendering, https://radiancefields.com/supersplat-ships-compute-based-webgpu-rendering-and-automatic-streamed-lod (2026; via search snippet)
69. CG Channel, SuperSplat Editor 3.0, https://www.cgchannel.com/2026/09/playcanvas-releases-supersplat-editor-3-0/ (September 2026; via search)
70. VR.org, "WebGPU Just Hit Baseline in Every Major Browser", https://vr.org/articles/webgpu-baseline-2026-three-js-webxr-default (2026; claims corrected above)
71. Utsubo, "What's New in Three.js (2026)" and "Migrate Three.js to WebGPU (2026)", https://www.utsubo.com/blog/threejs-2026-what-changed and https://www.utsubo.com/blog/webgpu-threejs-migration-guide (2026; via search snippets)
72. Digital Strategy Force, r160 article, https://digitalstrategyforce.com/journal/what-does-threejs-r160-mean-for-web-developers-in-2026/ (2026; wrong claims)
73. byteiota, WebGPU 2026, https://byteiota.com/webgpu-2026-70-browser-support-15x-performance-gains/ (2026; via search)
74. Headless WebGPU notes, https://tigerabrodi.blog/how-to-get-webgpu-in-headless-chrome-on-cloud-gpus and https://agent-browser.dev/webgpu (2026; via search snippets)
75. threewright local notes, templates/html-webgpu/template.json and ai-docs/HANDOFF.md (2026-09-26)
76. Bundle measurements, esbuild 0.25.12 and Rollup 4.63.5 with @rollup/plugin-terser 0.4 and @rollup/plugin-node-resolve 16 on three 0.186.1 (run 2026-09-26)

## Corrections (lead review, 2026-09-26)

- Section 6.3 lists `computeAsync()` among the *Async methods deprecated in r181. In r186 `Renderer.computeAsync()` carries no `@deprecated` tag and no warning: it awaits `init()` and calls `compute()`, and `compute()` before init even suggests it (node_modules/three/src/renderers/common/Renderer.js). The deprecated ones are `renderAsync`, `clearAsync`, `clearColorAsync`, `clearDepthAsync`, `clearStencilAsync`, `hasFeatureAsync`, `initTextureAsync`, the PMREMGenerator `from*Async` methods, `RenderPipeline.renderAsync`, `QuadMesh.renderAsync` and `KTX2Loader.detectSupportAsync`.
