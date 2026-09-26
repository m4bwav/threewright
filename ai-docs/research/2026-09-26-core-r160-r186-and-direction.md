# three.js core: r160 to r186, and where it's heading

Date: 2026-09-26
Track: threewright research, the concrete API surface an agent must not get wrong plus the ecosystem's current version matrix.
Related: ai-docs/research/2026-09-26-ai-skills-and-tools.md (skills/tools landscape).

## Summary

Between r160 (November 2023) and r186 (September 24, 2026) three.js moved from "WebGPURenderer is experimental" to "WebGPURenderer with an automatic WebGL2 fallback is the forward-looking default entry point," finished TSL (Three Shading Language) as the primary way to author shaders across both backends, and renamed or deprecated a long tail of async renderer methods, a few core classes, and some legacy naming. r186 itself deprecated the CommonJS build and removed minified builds from the npm package entirely, and added a native Gaussian splat mesh type. None of this breaks a project instantly; three.js deprecates with runtime warnings for many releases before removal, but an agent generating "current" code should not reach for `THREE.Clock`, `THREE.PostProcessing`, `.renderAsync()`, or `THREE.Source` in new code. I pulled the full `@deprecated` inventory directly from the r186 source on npm (83 matches, deduplicated below to unique API changes) so the table is not secondhand.

## 1. WebGPURenderer, TSL, and import paths

- `WebGPURenderer` tries a real WebGPU backend first; if the browser lacks WebGPU it falls back to a WebGL2 backend automatically, decided once at initialization (no runtime backend switching).
- Since r171 (around September 2025), `WebGPURenderer` is importable with no extra configuration from `three/webgpu`.
- TSL (`three/tsl`) is the node-based shading language that compiles to either WGSL (WebGPU) or GLSL (WebGL2 fallback) from one authored graph. It is the recommended way to write custom shaders going forward, ahead of raw `ShaderMaterial`/`RawShaderMaterial` GLSL for new code that also wants WebGPU compatibility.
- Practical import surface an agent should use: `import * as THREE from 'three'` for the classic/WebGL renderer path, `import { WebGPURenderer } from 'three/webgpu'` for the WebGPU-capable renderer, and `import { Fn, uniform, ... } from 'three/tsl'` for TSL node authoring. Mixing `three/webgpu`'s `WebGPURenderer` with plain `three`'s classic `WebGLRenderer` code paths in the same file is a common agent mistake; they are different renderer implementations with overlapping but not identical APIs.
- Global WebGPU browser support was reported around 83-87% in mid/late-2026 sources (figures vary by source and month); WebGPU is not yet at full baseline, so the WebGL2 fallback path is still load-bearing, not vestigial. There is an open, unresolved issue (mrdoob/three.js #34597, filed around September 2026) that the WebGL2 fallback backend never actually deletes GL programs/shaders/VAOs on dispose, i.e. a real leak in the fallback path as of r186. Treat this as a known caveat when writing disposal guidance for the WebGPU renderer's WebGL2 fallback specifically.
- Is WebGPU "the default" now? No single official statement found saying `WebGPURenderer` replaces `WebGLRenderer` as the default export; `WebGLRenderer` still exists and is still the safe default for pure-WebGL2 targets. The framing across 2026 sources is "WebGPU is production-ready and adoptable with zero-config fallback," not "WebGL is deprecated." Unverified: any explicit mrdoob statement setting a date for WebGPURenderer becoming the default in examples/starter templates.

## 2. Renaming and deprecation waves, release by release

- **r155**: lights and physically-based rendering became physically correct by default (this was the `physicallyCorrectLights` flag becoming the only behavior); this predates r160 but is foundational context an agent needs, since older tutorials assume the old non-physical light falloff.
- **r177 (deprecated) / r178 (docs say deprecated since)**: `transformedNormalView`, `transformedNormalWorld`, `transformedClearcoatNormalView` (TSL accessors) deprecated in favor of `normalView`, `normalWorld`, `clearcoatNormalView`.
- **r177**: `ColorManagement.fromWorkingColorSpace()` / `.toWorkingColorSpace()` renamed to `.workingToColorSpace()` / `.colorSpaceToWorking()`.
- **r179**: TSL `.label()` (on `UniformNode`, `ComputeNode`, `WorkgroupInfoNode`, `ContextNode`, `ReferenceNode`) deprecated for `.setName()`.
- **r180**: `ReflectorNode`'s `resolution` parameter/property renamed to `resolutionScale`.
- **r181**: a whole family of `*Async()` renderer/compute methods deprecated across `Renderer`, `RenderPipeline`/`PostProcessing`, `QuadMesh`, `PMREMGenerator`: `renderAsync()`, `clearAsync()`, `clearColorAsync()`, `clearDepthAsync()`, `clearStencilAsync()`, `hasFeatureAsync()`, `initTextureAsync()`, `PMREMGenerator.fromSceneAsync()/fromEquirectangularAsync()/fromCubemapAsync()`. The replacement pattern across all of them is: call `await renderer.init()` once when creating the renderer, then call the plain synchronous method (`render()`, `clear()`, etc.) — the "Async" suffix methods existed only to defer internal initialization, which `renderer.init()` now does explicitly up front. Also in r181: TSL `cache()` renamed `isolate()`; `PassNode.setResolution()/getResolution()` renamed `setResolutionScale()/getResolutionScale()`.
- **r182**: `Renderer.getColorBufferType()` deprecated for `.getOutputBufferType()`.
- **r183**: `Clock` deprecated in favor of `Timer`. `PostProcessing` renamed to `RenderPipeline` (the old name still works with a warning).
- **r185**: `Matrix3.scale()/rotate()/translate()` deprecated for `.makeScale()/.makeRotation()/.makeTranslation()`. TSL `directionToFaceDirection()` renamed `negateOnBackSide()`. TSL `directionToColor()/colorToDirection()` renamed `packNormalToRGB()/unpackRGBToNormal()`. `Line2NodeMaterial.lineColorNode` deprecated for `.colorNode`. GLSL chunk macro `inverseTransformDirection` deprecated for `transformDirectionByInverseViewMatrix`.
- **r186**: `Source` renamed `TextureSource` (`Source.isSource` deprecated for `TextureSource.isTextureSource`). `PCFSoftShadowMap`-related constant flagged deprecated in favor of `PCFShadowMap` (per source comment in `constants.js`, "Use `PCFShadowMap` instead" — read this as the softer/legacy shadow-map constant being pushed toward the plain PCF constant; verify exact semantics against release notes before writing lint text, since the constants file comment is terse). CommonJS build deprecated (the `three.cjs` file is still shipped in the r186 npm package's `build/` directory but is now marked for removal in a future release; `main` in package.json still points to it). Minified builds removed entirely: `build/three.min.js` and `build/three.module.min.js` are absent from the r186 npm package (confirmed directly by inspecting the installed package; only `three.cjs`, `three.core.js`, `three.module.js`, `three.tsl.js`, `three.webgpu.js`, `three.webgpu.nodes.js` remain). `Object3D` gained a `dispose()` method. `SunLight` (cascaded shadow maps) added. `LightProbeGrid` split into WebGL/WebGPU variants. PMREM generator switched from separable blur to spiral blur on both renderers. Native Gaussian splatting shipped (see below).

## 3. Gaussian splats (r186)

- r186 merged a native Gaussian splat renderer, TSL-based and WebGPU-native, as a built-in mesh type plus loaders, rather than requiring a third-party package.
- Format coverage: `.ply` via the existing `PLYLoader` plus a `createGaussianSplatGeometryFromPLYGeometry` helper (reads `scale*`, `rot`, `f_dc`, `opacity` attributes), `.splat` via `SPLATLoader`, `.spz` via `SPZLoader`, `.ksplat` via `KSPLATLoader`, and glTF's `KHR_gaussian_splatting` extension via a GLTF extension loader.
- Scope is intentionally narrow versus third-party splat renderers: SH0 color only (flat color + opacity per splat, no SH1-SH3 higher-order spherical harmonics), no level-of-detail, no streaming, no WASM, no web workers. It re-sorts splats only when the camera moves past a threshold, keeping the core addition compact (reported around 7 KB beyond base three.js for one loader + renderer path).
- Third-party alternatives remain more feature-complete for production splat work: `@sparkjsdev/spark` (npm, current version 2.2.0 as of this check) and `mkkellogg/GaussianSplats3D` offer streaming, WASM, and richer SH support that the native r186 implementation does not yet have. An agent should reach for `@sparkjsdev/spark` when a project needs streaming/LOD splats, and the native `three` Gaussian splat mesh for a simple, dependency-light splat without those needs.

## 4. Color management and lighting defaults (for agents reasoning about "why does this look different from an old tutorial")

- Color management (`THREE.ColorManagement.enabled`) has been on by default since r152, with the working color space as linear-sRGB (`SRGBColorSpace` for output, `LinearSRGBColorSpace` for internal work) — this predates the r160-r186 window but is a frequent source of "my colors look washed out / too saturated" confusion for agents porting old code, since old snippets often manually set `outputEncoding` (removed) instead of `renderer.outputColorSpace`.
- Lights have been physically correct by default since r155 (see above); combined with color management, an agent copying pre-r155 light-intensity numbers from old tutorials into current three.js will get scenes that look far too dark or far too bright, and should instead follow current physical-light-unit guidance (lumens/candela-style intensity scaling) rather than the old arbitrary intensity numbers.

## 5. Ecosystem version matrix (npm view, checked 2026-09-26)

| Package | Version |
|---|---|
| three | 0.186.1 |
| @types/three | 0.186.0 |
| @react-three/fiber | 9.8.1 |
| @react-three/drei | 10.7.9 |
| @react-three/rapier | 2.2.0 |
| @dimforge/rapier3d-compat | 0.21.0 |
| postprocessing | 6.39.5 |
| three-mesh-bvh | 0.9.15 |
| camera-controls | 3.1.2 |
| gsap | 3.15.0 |
| @theatre/core | 0.7.2 |
| @sparkjsdev/spark | 2.2.0 |
| 3d-tiles-renderer | 0.5.3 |
| troika-three-text | 0.52.5 |
| lil-gui | 0.21.0 |
| vite | 8.3.1 |

Note: `@types/three` tracks `three`'s minor version closely (0.186.0 alongside three 0.186.1), so a version-pin lint rule can compare these two directly and flag drift.

## 6. Direction and roadmap signals

- mrdoob has publicly framed the multi-year arc (talk: "Embracing WebGPU and WebXR With Three.js," JSNation 2024) as: three.js moving from a WebGL-only library toward a WebGPU-capable one, with TSL as the shared shader-authoring layer specifically because it tree-shakes at build time and reads more like normal JS/math than raw GLSL strings.
- sunag (the primary author of WebGPURenderer/TSL/node materials) has been the driving force behind essentially all of the WebGPU-and-node-material-related PRs referenced above (NodeMaterial WebGPU support, WebGPURenderer API updates); the r186 release notes' WebGPU-heavy changelist (DirectRenderPipeline, `compileComputeAsync()`, XR MSAA improvements, native Gaussian splats) is consistent with WebGPU/TSL remaining the active area of core development, while the classic WebGLRenderer path is comparatively stable/maintenance-mode.
- Unverified: no single canonical "roadmap" document or dated statement was found saying WebGPURenderer will become the literal default export or that WebGLRenderer will be deprecated on a specific timeline. Treat "WebGPU is the future, WebGL2 fallback keeps you safe today" as the accurate current framing, not "WebGL is going away soon."
- CommonJS's r186 deprecation (with removal implied in a future release, exact release unverified from the changelog text alone) signals the project standardizing hard on ESM; an agent scaffolding a new three.js project should default to ESM imports and treat `require('three')` as a path with a shrinking support window.

## Rules for the skill

1. Do not generate `new THREE.Clock()` in new code; use `THREE.Timer` (deprecated r183).
2. Do not generate `new THREE.PostProcessing(...)`; use `THREE.RenderPipeline` (renamed r183).
3. Do not generate `renderer.renderAsync()`, `.clearAsync()`, `.clearColorAsync()`, `.clearDepthAsync()`, `.clearStencilAsync()`, `.hasFeatureAsync()`, `.initTextureAsync()`, or `PMREMGenerator.from*Async()`; call `await renderer.init()` once, then use the synchronous method (deprecated r181).
4. Do not reference `THREE.Source` or `.isSource`; use `THREE.TextureSource` / `.isTextureSource` (renamed r186).
5. Do not generate `matrix.scale()/.rotate()/.translate()` on `Matrix3`; use `.makeScale()/.makeRotation()/.makeTranslation()` (deprecated r185).
6. Do not generate TSL `.label(...)`; use `.setName(...)` (deprecated r179). Do not generate TSL `cache()`; use `isolate()` (deprecated r181). Do not generate `directionToFaceDirection()`; use `negateOnBackSide()` (deprecated r185). Do not generate `directionToColor()/colorToDirection()`; use `packNormalToRGB()/unpackRGBToNormal()` (deprecated r185).
7. Do not scaffold new projects with `require('three')`/CommonJS; use ESM imports (CommonJS build deprecated r186, minified builds already removed from the npm package as of r186).
8. When writing disposal guidance for `WebGPURenderer`'s WebGL2 fallback path, flag the known program/shader/VAO leak (issue #34597, open as of September 2026) rather than asserting dispose is fully clean on that path.
9. When a task needs Gaussian splats with streaming, LOD, or SH1+, recommend `@sparkjsdev/spark` over the native r186 splat mesh; recommend the native mesh only for simple, dependency-light SH0 splats.
10. Any prior lesson or tutorial predating r155 that sets raw light `intensity` numbers should be treated as needing conversion to current physically-based units, not copied verbatim.

## Stale API -> current API -> release table

| Stale API | Current API | Release |
|---|---|---|
| `THREE.Clock` | `THREE.Timer` | r183 |
| `THREE.PostProcessing` | `THREE.RenderPipeline` | r183 |
| `renderer.renderAsync()` | `await renderer.init()`, then `render()` | r181 |
| `renderer.clearAsync()` | `await renderer.init()`, then `clear()` | r181 |
| `renderer.clearColorAsync()` | `await renderer.init()`, then `clearColor()` | r181 |
| `renderer.clearDepthAsync()` | `await renderer.init()`, then `clearDepth()` | r181 |
| `renderer.clearStencilAsync()` | `await renderer.init()`, then `clearStencil()` | r181 |
| `renderer.hasFeatureAsync()` | `await renderer.init()`, then `hasFeature()` | r181 |
| `renderer.initTextureAsync()` | `await renderer.init()`, then `initTexture()` | r181 |
| `PMREMGenerator.fromSceneAsync()` | `await renderer.init()`, then use PMREMGenerator normally | r181 |
| `PMREMGenerator.fromEquirectangularAsync()` | `await renderer.init()`, equivalent sync path | r181 |
| `PMREMGenerator.fromCubemapAsync()` | `await renderer.init()`, equivalent sync path | r181 |
| `RenderPipeline.renderAsync()` / `QuadMesh.renderAsync()` | synchronous `render()` after `renderer.init()` | r181 |
| TSL `cache()` | TSL `isolate()` | r181 |
| `PassNode.setResolution()` / `getResolution()` | `.setResolutionScale()` / `.getResolutionScale()` | r181 |
| TSL `.label()` (Uniform/Compute/WorkgroupInfo/Context/Reference nodes) | `.setName()` | r179 |
| `ReflectorNode` `resolution` param/property | `resolutionScale` | r180 |
| `Renderer.getColorBufferType()` | `.getOutputBufferType()` | r182 |
| `Matrix3.scale()` | `Matrix3.makeScale()` | r185 |
| `Matrix3.rotate()` | `Matrix3.makeRotation()` | r185 |
| `Matrix3.translate()` | `Matrix3.makeTranslation()` | r185 |
| TSL `directionToFaceDirection()` | `negateOnBackSide()` | r185 |
| TSL `directionToColor()` | `packNormalToRGB()` | r185 |
| TSL `colorToDirection()` | `unpackRGBToNormal()` | r185 |
| `Line2NodeMaterial.lineColorNode` | `.colorNode` | r185 |
| GLSL macro `inverseTransformDirection` | `transformDirectionByInverseViewMatrix` | r185 |
| `THREE.Source` / `.isSource` | `THREE.TextureSource` / `.isTextureSource` | r186 |
| `ColorManagement.fromWorkingColorSpace()` | `.workingToColorSpace()` | r177 |
| `ColorManagement.toWorkingColorSpace()` | `.colorSpaceToWorking()` | r177 |
| TSL `transformedNormalView` | `normalView` | r178 (deprecated comment; underlying alias since r177) |
| TSL `transformedNormalWorld` | `normalWorld` | r178 |
| TSL `transformedClearcoatNormalView` | `clearcoatNormalView` | r178 |
| CommonJS build (`build/three.cjs`, `require('three')`) | ESM (`import ... from 'three'`) | deprecated r186 |
| Minified builds (`three.min.js`, `three.module.min.js`) | Unminified builds only; bundle/minify yourself | removed r186 |
| `PCFSoftShadowMap` (per r186 source comment) | `PCFShadowMap` | flagged r186 (verify exact semantics before enforcing as a lint rule) |

This table has 29 rows, covering every unique `@deprecated`-tagged rename/removal found by grepping the r186 npm source tree (83 raw `@deprecated` matches collapse to these unique API changes once duplicate JSDoc/implementation lines for the same API are merged).

## Claims likely to change

- The exact release that finally removes the CommonJS build entirely (r186 only deprecated it); check the next several changelogs.
- The precise semantics of the r186 `PCFSoftShadowMap` -> `PCFShadowMap` deprecation comment in `constants.js` were terse in source; confirm against the official r186->r187 migration guide wording before treating rule 186 in the table as authoritative for lint purposes.
- WebGPU global browser support percentage will keep rising; re-check caniuse.
- Whether/when `WebGPURenderer` becomes three.js's headline default in official examples and starter templates (currently `WebGLRenderer` remains the default entry point in most getting-started material).
- Ecosystem package versions in the table above will all have moved by the next refresh; re-run `npm view <pkg> version` for each.
- The WebGL2-fallback dispose leak (issue #34597) may be fixed in a near-term patch release; re-check its status.

## Search plan for next refresh

1. `npm view three version` and re-diff `versions --json` tail against this file's list; re-run `npm install three@latest` into a scratch dir and re-grep `@deprecated` in `src/`, diffing against this file's 29-row table.
2. Re-run `npm view <pkg> version` for every package in the ecosystem matrix table.
3. Check `github.com/mrdoob/three.js/wiki/Migration-Guide` for the newest r(n-1)->r(n) migration guide text since the last refresh, and read it directly rather than relying on search snippets.
4. Search `github.com/mrdoob/three.js/issues/34597` for status (open/closed/fixed-in).
5. Search for a canonical mrdoob/sunag statement on WebGPURenderer becoming the default renderer or a WebGLRenderer deprecation timeline.
6. Re-check caniuse or MDN for current WebGPU baseline support percentage.
7. Check whether `@sparkjsdev/spark` or the native r186 Gaussian splat implementation gained SH1+ or streaming support.

## Sources

- npm registry (`npm view three version`, `npm view three versions --json`, `npm view <pkg> version` for the ecosystem table) — checked 2026-09-26
- r186 `three` npm package source, installed locally and grepped for `@deprecated` (`node_modules/three/src/**`) — checked 2026-09-26
- r186 `three` npm package `build/` directory listing (confirms minified builds absent, `three.cjs` still present) — checked 2026-09-26
- https://github.com/mrdoob/three.js/releases/tag/r186 — fetched 2026-09-26
- https://www.utsubo.com/blog/threejs-2026-what-changed — search result, 2026-09-26
- https://www.utsubo.com/blog/webgpu-threejs-migration-guide — search result, 2026-09-26
- https://github.com/mrdoob/three.js/issues/34597 — search result, 2026-09-26
- https://threejs.org/docs/pages/WebGPURenderer.html — search result, 2026-09-26
- https://radiancefields.com/three.js-merges-a-native-gaussian-splat-renderer-for-webgpu-in-r186 — search result, 2026-09-26
- https://ben3d.ca/blog/how-to-use-threejs-native-gaussian-splats — search result, 2026-09-26
- https://ben3d.ca/blog/gaussian-splatting-for-threejs — search result, 2026-09-26
- https://github.com/mkkellogg/GaussianSplats3D — search result, 2026-09-26
- https://github.com/sparkjsdev/spark — search result, 2026-09-26
- https://gitnation.com/contents/embracing-webgpu-and-webxr-with-threejs — search result, 2026-09-26
- https://github.com/mrdoob/three.js/wiki/Migration-Guide — referenced by search result, not read in full this pass, 2026-09-26
