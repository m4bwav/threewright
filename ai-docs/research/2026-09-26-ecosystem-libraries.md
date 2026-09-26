# Three.js ecosystem libraries in 2026

Date: 2026-09-26
Track: research for threewright, "the three.js ecosystem libraries in 2026" (feeds `kb/libraries/<slug>.md` and the `tw versions` baselines)
Status: first pass. Claims marked "unverified" were not confirmed against a primary source.

## Summary

Baseline on 2026-09-26: three 0.186.1 (published 2026-09-24, 18,853,550 weekly downloads), @types/three 0.186.0 (2026-09-11), React 19.3.0 (2026-09-09), Vue 3.5.43, Svelte 5.57.1, Angular 22.2.0 (2026-09-23), Vite 8.3.1 (2026-09-24).

- **React stack.** The stable pair is @react-three/fiber 9.8.1 (2026-09-24) plus @react-three/drei 10.7.9 (2026-09-25). R3F 9.8.0 added React 19.3 support. The WebGPU-first line is R3F 10.0.0-alpha.5 (2026-09-08) plus drei 11.0.0-alpha.7 (2026-09-05). Both alphas require three >=0.185 and cap React below 19.3, so they conflict with the current React 19.3.0.
- **WebGPU splits the ecosystem.** Ready for WebGPURenderer: three's own RenderPipeline, 48 TSL display nodes and the Inspector, three-mesh-bvh (`/webgpu`), three-msdf-text-utils, @pmndrs/glyph (WebGPU only), @pixiv/three-vrm, stats-gl 4, three-nebula (`/webgpu`), Threlte 8, TresJS 5 (experimental), A-Frame 1.7 and later, the Spline runtime, R3F 9 (manual async factory) and R3F 10 alpha. WebGL only: pmndrs postprocessing and @react-three/postprocessing, n8ao, troika-three-text, @pmndrs/uikit and @react-three/xr (their builds use `onBeforeCompile`), Spark, three-gpu-pathtracer, three-custom-shader-material, @takram/three-clouds, model-viewer and IWSDK.
- **Physics.** Rapier JS 0.21.0 (2026-09-25) adds soft bodies and changes several method signatures. @react-three/rapier 2.2.0 (2025-11-03) still pins Rapier 0.19.2. Jolt (jolt-physics 1.1.0) is stable and three ships a JoltPhysics addon. cannon-es has not released since 2022-08-12. New pure TypeScript engines exist: Bounce (used by an official three.js example) and crashcat.
- **Post-processing.** pmndrs postprocessing 6.39.5 supports three >=0.168 <0.187 (so r186 works today) and has no WebGPU plan found. v7 is still beta (7.0.0-beta.16, capped below r184). For WebGPU, three's RenderPipeline (renamed from PostProcessing in r183) with TSL nodes is the path.
- **Legacy in 2026.** three-stdlib (drei 11 drops it), lamina (archived), cannon.js and cannon-es, ammo.js (no official npm release), GaussianSplats3D (README points to Spark), three-mesh-ui (npm 2023), @react-three/a11y (2022), r3f-perf (2024), framer-motion-3d (deprecated), realism-effects (2023), Theatre.js public packages (0.7.2 from 2024), @react-three/cannon, @react-three/flex, dat.gui, stats.js.
- **Registry quirks that `tw versions` must handle.** Needle's `latest` tag is 6.0.0-alpha.3 while `stable` is 5.1.13. IWSDK's `latest` is 1.0.0-rc.2 while 1.0.0 sits on `next`. troika-three-text's `latest` is 0.52.5 while 0.53.0 exists. @needle-tools/gltf-progressive's `latest` is 4.0.0-alpha.3.
- **Download counts mislead.** @types/three depends on @dimforge/rapier3d-compat ~0.12.0, @tweenjs/tween.js ~23.1.3 and meshoptimizer ~1.1.1. drei 10 depends on three-stdlib, stats.js, stats-gl 2, meshline, maath, detect-gpu, camera-controls, troika and three-mesh-bvh 0.8. Weekly numbers for those packages are mostly transitive installs.
- **Libraries now ship agent tooling.** Needle Engine ships a `SKILL.md` in its npm package. IWSDK 1.0 ships an MCP runtime in `dist/mcp`. pmndrs publishes a Claude Code plugin with a docs MCP server (`https://docs.pmnd.rs/api/mcp`). pmndrs/math offers `npx skills add pmndrs/math --skill math`.

---

## Method and caveats

- Versions, publish dates, dist-tags, peer ranges, deprecation flags and license fields come from the npm registry packuments (`https://registry.npmjs.org/<pkg>`), fetched 2026-09-26. "Published" is the npm publish time of the listed version.
- Weekly downloads come from the `downloads.weekly` field of the npm registry search API (`https://registry.npmjs.org/-/v1/search?text=<pkg>`), read 2026-09-26. api.npmjs.org, npmjs.com and npmtrends.com were blocked by the egress proxy. The search API hides deprecated packages, so their counts are unknown. Parallel search requests get rate limited; run them one at a time.
- GitHub numbers (stars, archived flag, last push, open count) come from the GitHub search API on 2026-09-26. "Open" counts issues plus pull requests. This is one snapshot, so there is no trend yet.
- WebGPU status comes from READMEs and release notes. Where no statement existed, the published npm build was searched for `three/webgpu`, `onBeforeCompile` and GLSL `ShaderMaterial`. Those rows say "inferred from build".
- "three range" is the `three` peer range of the latest version, or the three version a package bundles or aliases.

---

## 1. React (R3F ecosystem)

| package | latest | published | weekly downloads | three range | WebGPU | status | license | use for |
|---|---|---|---|---|---|---|---|---|
| @react-three/fiber (v9, `latest`) | 9.8.1 | 2026-09-24 | 6,014,597 | >=0.156; react >=19 <19.4 | Yes, by passing an initialized WebGPURenderer through the async `gl` factory | Active. 32.5k stars, push 2026-09-26, 90 open. 9.8.0 (2026-09-22) added React 19.3 | MIT | Default for React apps. Avoid only if you need v10-only TSL hooks. |
| @react-three/fiber (v10, `alpha`) | 10.0.0-alpha.5 | 2026-09-08 | same package | >=0.185.0; react >=19.0 <19.3 | First class: `@react-three/fiber/webgpu` and `/legacy` entries, `useUniforms`, `useNodes`, `useLocalNodes`, `useRenderPipeline`, `useBuffers`, `useGPUStorage`, one renderer shared by several canvases | Alpha since 2026-01-14. Daily canaries (10.0.0-canary.14007b4 on 2026-09-26). Scheduler split out as @pmndrs/scheduler 0.2.0. `state.gl` becomes `state.renderer` | MIT | Trying WebGPU and TSL in new React work. Avoid in production and on React 19.3. |
| @react-three/drei (v10) | 10.7.9 | 2026-09-25 | 4,367,871 | >=0.159; fiber ^9.0.0; react ^19 | Partial. Renderer-agnostic helpers work; GLSL materials and FBO helpers do not | Active. 9.9k stars, push 2026-09-26, 120 open. Depends on three-stdlib ^2.35.6, three-mesh-bvh ^0.8.3, stats-gl ^2.2.8, troika ^0.52.4, @mediapipe/tasks-vision, hls.js | MIT | Controls, loaders, Environment, Text, ScrollControls in R3F 9. Avoid in vanilla projects. |
| @react-three/drei (v11, `alpha`) | 11.0.0-alpha.7 | 2026-09-05 | same package | >=0.185; fiber >=10.0.0-0; react >=19.0 <19.3 | Entries `/webgpu`, `/legacy`, `/core`, `/external`, `/experimental`, `/native`. WebGPU port in progress | Alpha. Drops three-stdlib and meshline. Next milestones: alpha.8 "WebGPU Correctness", then beta.1. The guide warns that "implemented" only means a file exists | MIT | Tracking only. Avoid until beta. |
| @react-three/postprocessing | 3.1.2 | 2026-09-22 | 796,783 | >=0.156.0; postprocessing ^6.36.0; fiber >=9.7.0 | No (wraps pmndrs postprocessing) | Revived: 3.0.5 to 3.1.2 between 2026-08-09 and 2026-09-22 (`EffectGroup`, `mergeMode`, `createEffectComponent`). Push 2026-09-22, 21 open. Depends on n8ao ^2.0.0 | MIT | Bloom, AO, DoF in R3F on WebGLRenderer. Avoid with WebGPURenderer. |
| @react-three/rapier | 2.2.0 | 2025-11-03 | 135,273 | >=0.159.0; fiber ^9.0.4; react ^19 | n/a (physics) | Slow. No release for 10 months. Pins @dimforge/rapier3d-compat 0.19.2 while Rapier is at 0.21.0. Push 2025-11-03, 45 open | MIT (repo; no license field in package.json) | Physics in R3F. Avoid if you need Rapier 0.20+ features (soft bodies). |
| @react-three/xr | 6.6.30 | 2026-05-29 | 60,634 | any; fiber >=8; react >=18 | No WebGPU path found (build uses `onBeforeCompile`; inferred from build) | Quiet since May. Push 2026-05-29, 68 open. Vanilla core is @pmndrs/xr 6.6.30 | MIT text ("SEE LICENSE IN LICENSE") | VR and AR in R3F with pointer events and hands. Avoid in vanilla apps. |
| @react-three/uikit | 1.0.76 | 2026-09-01 | 19,007 (vanilla @pmndrs/uikit 23,517) | via @pmndrs/uikit: >=0.162 | No (build uses `onBeforeCompile`; inferred from build) | Active, monthly. 1.0.0 on 2025-05-20. Push 2026-09-01, 52 open | MIT text | Flexbox panels in 3D and XR. Avoid for normal page UI (use DOM). |
| @react-three/test-renderer | 9.1.1 | 2026-07-31 | 60,788 | >=0.156; fiber >=9.0.0; react ^19.0.0 (alpha: <19.3) | n/a (no GPU) | Active, R3F monorepo | MIT | Scene-graph unit tests for R3F. Not for pixels. |
| @react-three/a11y | 3.0.0 | 2022-05-15 | 575 | >=0.133.0; fiber >=8 | n/a | Dormant. Code unchanged since 2022; only a docs-build commit on 2026-08-20. 16 open | MIT | Avoid for new work. Use DOM equivalents. |
| r3f-perf | 7.2.3 | 2024-11-08 | 44,400 | >=0.133; fiber >=8 | No (issue #63 "WebGpu support" open since 2025-01-31) | Stale. Push 2024-12-20. Depends on drei ^9.103.0, so R3F 9 apps install a second drei. Open issues on React 19 fonts and Next.js 16 | MIT | Legacy overlay. Prefer stats-gl, drei `StatsGl` or three's Inspector. |
| leva | 0.10.1 | 2025-10-31 | 1,072,214 | none; react ^18 or ^19 | n/a (DOM) | Low activity. Push 2025-11-09, 128 open. Issue "Is this project alive?" open since 2023 | MIT | React tweak panels (ecctrl uses it). Use lil-gui in vanilla. |
| zustand | 5.0.15 | 2026-08-13 | 62,018,941 | none; react >=18 optional | n/a | Active. Push 2026-09-22, 7 open. R3F 9 and 10 use it for their internal store | MIT | App and game state outside the render loop. Read with `getState()` inside `useFrame`. |
| ecctrl | 2.0.2 | 2026-09-06 | 2,679 | >=0.184.0; fiber >=9.4; @react-three/rapier >=2.2.0; drei >=10.7; react >=19.2.7 | Unverified | Active. 2.0 released 2026-06-15 and moved to pmndrs. Push 2026-09-06, 68 open | MIT | Character, vehicle and drone controllers on R3F plus Rapier. |
| @react-spring/three | 10.1.2 | 2026-06-24 | 2,271,053 | >=0.126; fiber >=6 | n/a | Active. 11.0.0-beta.0 on 2026-06-21 | MIT | Spring animation of R3F props. |
| koota | 0.6.6 | 2026-04-09 | 23,131 | none | n/a | Active (pmndrs ECS). Push 2026-09-20, 45 open | ISC | Data-oriented game state with React bindings. |

Notes:
- R3F v10 alpha.1 notes: WebGL and WebGPU renderers, TSL hooks, `useFrame` usable outside `<Canvas>`, cameras become part of the scene graph, new `Visible`, `Framed` and `Occluded` events. alpha.4 added multi-canvas with a shared WebGPU renderer, `useRenderPipeline` (replacing `usePostProcessing`), declarative background and environment, and fixed-resolution rendering.
- drei v11 imports: renderer-agnostic helpers stay on the root import. Materials, render targets (`Fbo`, `RenderTexture`, `CubeCamera`) and effects come from `/legacy` (WebGL) or `/webgpu`. `Stars` is WebGL only; the guide points WebGPU users to @pmndrs/sky (0.3.0, 2026-09-08, three >=0.185, R3F >=10).
- React 19.3.0 is out, but R3F 10 alpha, drei 11 alpha, @react-three/test-renderer 10 alpha and @pmndrs/glyph all declare React <19.3. Expect peer warnings or `--legacy-peer-deps`.
- drei 10 pulls three-mesh-bvh ^0.8.3. Apps that also install three-mesh-bvh 0.9.x get two copies.
- New pmndrs pieces: @pmndrs/scheduler 0.2.0 (the engine behind v10 `useFrame`), @react-three/start 0.1.7 (a file-based R3F meta-framework, 9 weekly downloads), pmndrs/react-three-examples (268 three.js examples rebuilt in R3F v10, WebGPU-first), pmndrs/triplex (visual editor for R3F).

## 2. Other frameworks and engines

| package | latest | published | weekly downloads | three range | WebGPU | status | license | use for |
|---|---|---|---|---|---|---|---|---|
| @tresjs/core (Vue) | 5.9.0 | 2026-09-14 | 39,696 | >=0.133; vue >=3.4 | Experimental: pass a WebGPURenderer factory to `<TresCanvas :renderer>` | Active. 5.0.0 on 2025-09-20 (ESM only). Push 2026-09-25, 104 open | MIT | Vue and Nuxt apps. |
| @tresjs/cientos | 5.9.0 | 2026-09-14 | 27,717 | >=0.133; @tresjs/core 5.9.0 exact | Partial, unverified (depends on three-stdlib and three-custom-shader-material) | Released in lockstep with core | MIT | drei-style helpers for Tres. |
| @tresjs/post-processing | 3.8.0 | 2026-09-14 | 11,326 | >=0.169 | No (pmndrs postprocessing ^6.39.1) | Lockstep | MIT | Effects on WebGLRenderer in Tres. |
| @threlte/core (Svelte) | 8.6.1 | 2026-09-24 | 81,668 | >=0.172; svelte >=5 | Yes: the `createRenderer` prop can return a WebGPURenderer | Active. 8.0.0 on 2025-01-20. Push 2026-09-24, 68 open | MIT | Svelte 5 apps. |
| @threlte/extras | 9.22.0 | 2026-09-24 | 38,016 | >=0.172 | Partial (bundles troika, which is WebGL only) | Active | MIT | Controls, text, glTF, interactivity for Threlte. |
| angular-three | 4.2.4 | 2026-07-15 | 1,903 | >=0.157.0 <0.183.0; @angular/core >=20 <22 | None found in the 4.2.4 build | Active but behind: excludes three r183 and later and Angular 22.2.0. Push 2026-08-08, 6 open | MIT | Angular 20 or 21 apps pinned to three 0.182 or older. |
| @needle-tools/engine | 6.0.0-alpha.3 on `latest`; 5.1.13 on `stable` | 2026-08-13; 2026-09-09 | 5,849 | Bundles a three fork: @needle-tools/three 0.169.19 (5.1.13) or 0.185.2-alpha.1 (6.0 alpha) | Partial, unverified | Active and commercial. 6.0 alphas add Gaussian splats via Spark and `.rad` streaming | Proprietary. LICENSE.md: "not open source"; free for non-commercial use, commercial use needs eligibility or a plan (Pro from EUR 49 per user per month, unverified) | Unity or Blender to web pipelines, iOS AR through App Clips. Avoid when you need stock three or an OSS license. `npm i @needle-tools/engine` installs the 6.0 alpha; use `@stable`. |
| aframe | 1.8.0 | 2026-06-23 | 35,075 | Bundles super-three 0.184.0 | Yes since 1.7.0 (WebGPURenderer and TSL). WebXR needs `forceWebGL` per the 1.7.0 blog | Active. Push 2026-07-13, 342 open | MIT | Declarative HTML WebXR scenes. |
| @iwsdk/core (Meta) | 1.0.0-rc.2 on `latest`; 1.0.0 on `next` | both 2026-09-24 | 1,155 | App must alias `three` to super-three 0.181.0 and add an npm `overrides` entry | No (creates a WebGLRenderer) | Active. 1.0.0 arrived one year after the first release (2025-09-17). Push 2026-09-25, 34 open | MIT | Quest-first WebXR: ECS, locomotion, grabbing, Havok physics (@babylonjs/havok), uikit panels, an MCP runtime. Avoid if the app needs another three version. |
| @google/model-viewer | 4.3.1 | 2026-06-04 | 494,418 | peer ^0.183.0 | No | Maintained. 4.3.0 (2026-06-01) added multi-model scenes. Push 2026-07-07, 119 open | Apache-2.0 | One tag to show a GLB with AR (Scene Viewer, Quick Look). Avoid for custom shaders or rule-based configurators. |
| @splinetool/runtime | 2.0.58 | 2026-09-25 | 681,079 | Bundles its own three; no dependency | Yes: WebGPU with WebGL fallback; custom TSL materials through `createCustomMaterial` (README) | Very active, near daily releases | No license field (proprietary, unverified) | Playing scenes designed in Spline. Avoid when you must own the scene graph; TSL nodes must come from the runtime's bundled three. |
| @splinetool/react-spline | 4.1.0 | 2025-07-15 | 184,258 | n/a | Through the runtime | Slow. Repo push 2026-03-13, 44 open | No license field; repo MIT | React wrapper for Spline scenes. |

Notes:
- IWSDK 1.0.0 adds gaze and pinch input and a VR Glasses emulator profile (Road to VR, secondary source). The 1.0.0 build contains `dist/mcp` (scene, ECS and UI debug tools). @iwsdk/vite-plugin-dev 1.0.0-rc.2 declares `vite ^7.0.0`, so Vite 8.3.1 is outside its range.
- A-Frame 1.8.0 caught up to three r184, removed the last WebVR code and renamed `oculus-touch-controls` to `meta-touch-controls` (VR.org and the A-Frame blog, secondary summary).
- Needle 5.1.13 still runs on a three r169 fork. Needle 6 alpha moves to a r185 fork.

## 3. Post-processing

| package | latest | published | weekly downloads | three range | WebGPU | status | license | use for |
|---|---|---|---|---|---|---|---|---|
| postprocessing (pmndrs) v6 | 6.39.5 | 2026-09-09 | 987,041 | >=0.168.0 <0.187.0 | No | Active. Each patch widens the three cap (6.39.1 allowed <0.185, 6.39.5 allows r186). Push 2026-09-19, 30 open | Zlib | Merged effect passes on WebGLRenderer. Avoid on WebGPURenderer. |
| postprocessing v7 | 7.0.0-beta.16 on `beta` | 2026-02-19 | n/a | >=0.179.0 <0.184.0 | No plan found (the v7 design issue #419 never mentions WebGPU) | Beta. beta.16 does not allow r186 | Zlib | Avoid for now. |
| three EffectComposer (`three/addons/postprocessing/*`) | in three 0.186.1 | 2026-09-24 | in three | r186 | No (WebGLRenderer only) | Still shipped: 30 files in `examples/jsm/postprocessing` | MIT | Simple WebGL chains (UnrealBloomPass, SMAAPass, OutputPass). |
| three RenderPipeline plus TSL display nodes (`three/webgpu`, `three/addons/tsl/display/*`) | in three 0.186.1 | 2026-09-24 | in three | r183 and later (PostProcessing deprecated in r183) | Yes, on WebGPU and on the WebGL2 fallback backend | 48 display modules in r186, including BloomNode, GTAONode, SSRNode, SSGINode, TRAANode, TAAUNode, FSR1Node, DepthOfFieldNode, OutlineNode, SMAANode, FXAANode, GodraysNode, LensflareNode, MotionBlur | MIT | Default post for WebGPURenderer and TSL projects. |
| n8ao | 2.0.1 | 2026-08-10 | 822,609 | >=0.137; postprocessing >=6.30.0 | No (README: "not yet compatible with WebGPU") | Maintained. Most downloads come from @react-three/postprocessing | ISC | Fast SSAO on WebGL. |
| three-good-godrays | 0.12.1 | 2026-08-06 | 596 | >=0.125.0 <=0.182.0 | No | Still used by three's `webgl_postprocessing_godrays` example (0.12.0) | No license field (unverified) | WebGL godrays. On WebGPU use GodraysNode. |
| @pmndrs/upscaler | 0.2.0 | 2026-07-29 | 341 | >=0.184.0 | WebGPU only | New (repo created 2026-07-09) | MIT | FSR1 spatial and FSR2/3-style temporal upscaling for three WebGPU. Watch list. |

## 4. Physics and collision

| package | latest | published | weekly downloads | three range | WebGPU | status | license | use for |
|---|---|---|---|---|---|---|---|---|
| @dimforge/rapier3d-compat | 0.21.0 | 2026-09-25 | 9,776,024 (mostly from @types/three's dependency on ~0.12.0) | none | n/a | Active. JS bindings now live in dimforge/rapier `bindings/typescript`; the old rapier.js repo is archived. 0.21.0 adds soft bodies and changes `PhysicsPipeline.step`, `RigidBodySet.remove` and `ColliderSet.remove` signatures. 0.20.0 (2026-08-08) moved compat files into `dist/` | Apache-2.0 | Default physics for games. WASM is inlined, so no separate `.wasm` fetch. |
| @dimforge/rapier3d | 0.21.0 | 2026-09-25 | 26,290 | none | n/a | Same | Apache-2.0 | Bundler builds that load the `.wasm` file separately. |
| @dimforge/rapier3d-simd-compat | 0.21.0 | 2026-09-25 | 2,568 | none | n/a | Since 2025-03 | Apache-2.0 | SIMD build where supported. |
| jolt-physics | 1.1.0 | 2026-07-11 | 2,897 | none | n/a | Active. 1.0.0 on 2025-12-28. three ships `three/addons/physics/JoltPhysics.js` (loads jolt-physics 1.0.0 from a CDN) and `physics_jolt_instancing`. Push 2026-08-23, 2 open | MIT | Large rigid-body scenes, vehicles, character virtual controller. |
| cannon-es | 0.20.0 | 2022-08-12 | 123,152 | none | n/a | Legacy. Last commit 2024-01-06 (docs). Repo not archived | MIT | Existing projects only. |
| cannon | 0.6.2 | 2015-03-28 | 4,236 | none | n/a | Dead | MIT (repo) | Avoid. |
| ammo.js | No official npm release (npm `ammo.js` 0.0.10 from 2016 is not the kripken build) | n/a | 562 (unofficial package) | none | n/a | kripken/ammo.js got commits in June and September 2026 after a gap since 2023, but no versioned release. three still ships AmmoPhysics and 6 ammo examples | zlib (Bullet), unverified | Legacy soft bodies and cloth. Prefer Jolt, or Rapier 0.21 soft bodies. |
| @perplexdotgg/bounce | 1.10.0 | 2026-08-10 | 209 | none | n/a | New (first release 2025-10-22). Pure TypeScript, no WASM, deterministic. three's `webgpu_postprocessing_ssgi_ballpool` example imports it (1.8.1). Repo on Codeberg | MIT | Small deterministic games without WASM. Unproven at scale. |
| crashcat | 0.0.5 | 2026-07-06 | 147 | optional >=0.182.0 | n/a | New (isaac-mason). Push 2026-09-25 | MIT | Pure JS, tree-shakeable physics experiments. Too early for production. |
| three-mesh-bvh | 0.9.15 | 2026-09-09 | 5,021,355 (drei 10 pulls 0.8.x) | >=0.159.0 | Yes: `three-mesh-bvh/webgpu` TSL and WGSL functions for compute ray queries | Active. 3.5k stars, push 2026-09-26, 82 open. Used by three examples (`webgl_raycaster_bvh`, `webgl_geometry_csg`, `webgl_renderer_pathtracer`) | MIT | Fast raycasts, shapecasts and capsule character collision against level meshes. |
| navcat | 0.4.1 | 2026-05-06 | 530 | optional >=0.180.0 | n/a | New (isaac-mason) | MIT | Navmesh generation and queries in pure JS. |
| @recast-navigation/three | 0.43.1 | 2026-04-07 | 6,325 | 0.x | n/a | Maintained. Push 2026-07-06, 31 open | MIT | Recast and Detour (WASM) navmeshes and crowds. |

## 5. Text and UI

| package | latest | published | weekly downloads | three range | WebGPU | status | license | use for |
|---|---|---|---|---|---|---|---|---|
| troika-three-text | 0.52.5 on `latest`; 0.53.0 untagged | both 2026-07-24 | 4,461,141 (drei dependency) | >=0.125.0 | No. TSL port request (#359) open | Slow but alive. 0.53.0 adds `styleRanges` and Safari fixes. Push 2026-07-24, 92 open | MIT | SDF text on WebGLRenderer (drei `Text`). Avoid on WebGPURenderer. |
| three-msdf-text-utils | 1.5.0 | 2026-03-12 | 1,718 | >=0.178.0 | Yes: `MSDFTextNodeMaterial` from `three-msdf-text-utils/webgpu` | Small and active. Push 2026-06-12, 2 open | ISC (npm field; repo has no license file) | MSDF text on WebGPU, TSL text effects. Needs pre-baked MSDF fonts. |
| @pmndrs/uikit | 1.0.76 | 2026-09-01 | 23,517 | >=0.162 | No (build uses `onBeforeCompile`; inferred from build) | Active. IWSDK builds its spatial UI on it | MIT text | Flexbox UI in 3D and XR, vanilla or R3F. |
| @pmndrs/glyph | 0.1.0 | 2026-09-18 | 1,913 | >=0.185.0; react >=19.0.0 <19.3; fiber 9.7 or later, or 10.0.0-alpha.4 or later | WebGPU first. README: it "does not support the classic WebGLRenderer" | Pre-1.0. Repo created 2026-07-22, daily canaries, 49 open | MIT | Typography engine with a font-baking CLI (bitmap, MSDF, Slug), React and TresJS adapters. Watch; avoid in production. |
| three-mesh-ui | 6.5.4 | 2023-03-24 | 5,971 | >=0.144.0 | No | Stale. Push 2023-12-03. 7.x "in evaluation" in PR #223. Needle ships its own fork | MIT | Avoid for new work. Use uikit. |
| three-text (countertype) | 0.6.5 | 2026-07-04 | 225 | >=0.160.0 | README claims WebGPU and WebGL adapters (unverified) | New (2025-09) | MIT | Watch list. |

## 6. Assets and pipelines

| package | latest | published | weekly downloads | three range | WebGPU | status | license | use for |
|---|---|---|---|---|---|---|---|---|
| @gltf-transform/core, /functions, /extensions | 4.5.0 | 2026-09-01 | 729,730 / 621,113 / 685,833 | none | n/a | Active. Push 2026-09-25, 77 open. 4.4 added EXT_mesh_features, EXT_structural_metadata, KHR_mesh_primitive_restart, KHR_accessor_float16/float64 | MIT | Scripted glTF optimization in Node or the browser. |
| @gltf-transform/cli | 4.5.0 | 2026-09-01 | 111,537 | none | n/a | Needs KTX-Software 4.4.0 or later (`ktx` binary) for KTX2. The 4.5.0 bundles contain no KHR_meshopt_compression or KHR_gaussian_splatting handling (inferred from build) | MIT | `optimize`, `inspect`, `validate` in agent workflows. |
| meshoptimizer | 1.3.0 | 2026-09-25 | 12,219,194 (mostly through @types/three) | none | n/a | Active. 1.0 on 2025-12-08 (stable API, ES modules). 1.3 adds a voxel remesher and normal generation. Push 2026-09-25, 6 open | MIT | Meshopt encode and decode, simplification. three r186 ships a decoder built from meshoptimizer 1.1. |
| gltfpack | 1.3.0 | 2026-09-25 | 10,732 | none | n/a | Active. `-ce khr` writes KHR_meshopt_compression (three r186's GLTFLoader reads it), `-gt` tangents (1.2), `-gn` normals (1.3) | MIT | One-shot GLB compression. |
| draco3d, draco3dgltf | 1.5.7 | 2024-01-17 | 5,306,454 / 191,426 | none | n/a | No release since 2024-01. Repo push 2026-09-24, 150 open | Apache-2.0 | Existing Draco assets. Prefer Meshopt for new assets. |
| KTX-Software (GitHub releases) | 4.4.2 stable; 5.0.0-rc2 | 2025-10-04; 2026-08-17 | n/a | n/a | n/a | 5.0 adds UASTC HDR and removes the legacy tools (`toktx`); use `ktx create`. Push 2026-09-24, 48 open | Apache-2.0 (unverified; GitHub reports NOASSERTION) | Encoding KTX2 (ETC1S, UASTC). |
| basis_universal (GitHub releases) | v2.50 | 2026-08-03 | n/a | n/a | n/a | v2.0 (2026-01-20) added ASTC LDR and XUASTC LDR. v2.50 adds XUASTC deblocking, XUBC7 and DDS | Apache-2.0 | Codec behind KTX2. three ships the transcoder in `examples/jsm/libs/basis`. |
| ktx-parse | 2.0.0 | 2026-09-05 | 1,707,205 | none | n/a | Active | MIT | Read and write KTX2 containers in JS. |
| ktx2-encoder | 0.6.0 | 2026-07-19 | 13,299 | none | n/a | Maintained | MIT | KTX2 encoding in the browser (WASM). |
| gltf-validator | 2.0.0-dev.3.10 | 2024-10-22 | 172,596 | none | n/a | Slow. No release since 2024-10; push 2026-09-18, 57 open | Apache-2.0 | Khronos validation report (also behind `gltf-transform validate`). |
| @pixiv/three-vrm | 3.5.5 | 2026-07-09 | 77,537 | >=0.137 | Yes (`MToonNodeMaterial` through `MToonMaterialLoaderPlugin`) | Active. @pixiv/three-vrm-animation 3.6.0-beta.0 on `next` (2026-09-25). Push 2026-09-25, 41 open | MIT | VRM avatars, expressions, spring bones. |
| @needle-tools/gltf-progressive | 3.6.1 on `stable`; 4.0.0-alpha.3 on `latest` | 2026-09-09 | 686 | >=0.183.0 | Unverified | Used by three's `webgl_loader_gltf_progressive_lod` example (3.2.0) | MIT | Progressive mesh and texture LOD for glTF. Install `@stable`. |

## 7. Animation and motion

| package | latest | published | weekly downloads | three range | WebGPU | status | license | use for |
|---|---|---|---|---|---|---|---|---|
| gsap | 3.15.0 | 2026-04-13 | 5,656,957 | none | n/a (renderer-agnostic) | Active (owned by Webflow). Push 2026-04-13, 6 open | GSAP Standard "no charge" license. Free for commercial use with all plugins since April 2025, but not OSI open source. It bars "Competitive Products", meaning visual no-code animation builders that compete with Webflow | Timelines, ScrollTrigger scroll stories, camera moves. |
| lenis | 1.3.26 | 2026-08-05 | 1,660,727 | none | n/a | Active. 2.0.0-dev.5 on `dev` (2026-09-18). Honors `prefers-reduced-motion` by default (README). Push 2026-09-22, 25 open | MIT | Smooth scroll driven from the GSAP ticker. |
| @theatre/core, @theatre/studio, @theatre/r3f | 0.7.2 | 2024-05-19 | 37,029 / 34,877 / 3,114 | r3f: >=0.155.0 and fiber ^8.13.6 | n/a | Frozen in public. README: "Theatre.js 1.0 is around the corner", development moved to a private repo. Public push 2024-08-14, 141 open | core Apache-2.0; studio AGPL-3.0-only | Designer keyframing when the editor is needed. Avoid with R3F 9 (peer ^8) and never ship studio in production (AGPL). |
| motion | 13.4.4 | 2026-09-25 | 24,073,819 | none | n/a | Active. No three.js integration since framer-motion-3d was dropped | MIT | DOM UI around the canvas. |
| framer-motion-3d | 12.4.13 | 2025-03-11 | Unknown (deprecated, hidden from search) | peer fiber 8.2.2 | n/a | Deprecated on npm: "Package no longer supported." | MIT | Avoid. |
| maath | 0.10.8 | 2024-07-07 | 4,848,813 (drei dependency) | >=0.134.0 | n/a | Superseded. Repo renamed pmndrs/math; 1.0.0 canaries in August 2026 | MIT | Existing drei-era code (`damp`, easing). |
| math (pmndrs) | 0.1.0 | 2026-09-11 | 3,204 | none | n/a | New. Allocation-free vectors, quaternions, noise, springs, seeded RNGs and IK. Ships an agent skill | MIT | Watch for data-oriented math. |
| camera-controls | 3.1.2 | 2025-11-17 | 4,496,678 (drei dependency) | >=0.126.1 | n/a (renderer-agnostic) | Stable. Push 2026-09-09, 102 open | MIT | Smooth orbit and dolly, `fitToBox`, scripted camera transitions. |
| three-stdlib | 2.36.1 | 2025-11-10 | 4,469,021 (drei 10 dependency) | >=0.128.0 | WebGL-era copies of addons | Legacy. drei 11 drops it. Push 2026-06-26, 35 open | MIT | Avoid. Import `three/addons/*` instead. |
| @tweenjs/tween.js | 25.0.0 | 2024-07-26 | 12,769,070 (mostly through @types/three ~23.1.3) | none | n/a | Low churn. three ships a copy in `examples/jsm/libs/tween.module.js` | MIT | Tiny tweens without GSAP. |
| @pmndrs/timeline | 0.3.10 | 2026-06-16 | 172 | any | n/a | New (2025-07) | MIT text | Composable, story-like 3D behaviors. Watch list. |

## 8. Rendering extras and tooling

| package | latest | published | weekly downloads | three range | WebGPU | status | license | use for |
|---|---|---|---|---|---|---|---|---|
| three-gpu-pathtracer | 0.0.24 | 2026-02-21 | 42,626 | >=0.180.0; three-mesh-bvh >=0.7.4 | No (WebGL2 `WebGLPathTracer`) | Repo active (push 2026-09-26, 58 open). Used by three's `webgl_renderer_pathtracer` | MIT | Path-traced stills and product shots. Not real time. |
| @takram/three-atmosphere | 0.19.1 | 2026-05-06 | 21,999 | >=0.170.0 (the `/webgpu` entry needs >=0.182.0) | Work in progress: `@takram/three-atmosphere/webgpu` | Active (push 2026-05-27, 28 open). Used by three's `webgl_loader_3dtiles` example | MIT | Physically based sky and aerial perspective at planet scale. |
| @takram/three-clouds | 0.7.6 | 2026-05-06 | 14,396 | >=0.170.0 | No (GLSL; TSL planned) | Same repo | MIT | Volumetric clouds over 3D Tiles on WebGL. |
| 3d-tiles-renderer | 0.5.3 | 2026-09-18 | 143,817 | optional >=0.167.0; fiber ^8.17.9 or ^9; Babylon >=8 | No explicit support in the 0.5.3 source (inferred) | Active (NASA-AMMOS). Push 2026-09-26, 112 open. three's example still pins 0.4.27 | Apache-2.0 | OGC 3D Tiles, Google Photorealistic Tiles, Cesium ion. |
| three-globe | 2.45.2 | 2026-04-04 | 336,824 | >=0.154 | Unverified | Active. Push 2026-04-04, 46 open | MIT | Globe object inside your own scene. |
| globe.gl (+ react-globe.gl 2.38.0) | 2.46.2 | 2026-08-22 | 243,149 (react 155,464) | depends on three >=0.179 <1 | Its three-render-objects dependency (1.42.0, 2026-05-16) has a `useWebGPU` option; whether globe.gl exposes it is unverified | Active. Push 2026-08-22, 133 open | MIT | Data globes (arcs, points, hexbins) in one call. |
| 3d-force-graph | 1.80.0 | 2026-04-05 | 390,278 | depends on three >=0.179 <1 | Same as globe.gl | Active. Push 2026-04-05, 250 open | MIT | 3D network graphs. |
| @sparkjsdev/spark | 2.2.0 | 2026-09-11 | 266,289 | >=0.180.0 | No (GLSL `ShaderMaterial` and `RawShaderMaterial`; WebGL2). A community fork PR adds WebGPU (unverified) | Active (World Labs). 2.0 on 2026-04-14. Push 2026-09-25, 116 open | MIT | Large or streamed Gaussian splat worlds with LoD. |
| @mkkellogg/gaussian-splats-3d | 0.4.7 | 2025-01-25 | 70,911 | >=0.160.0 | No | Deprecated in README ("no longer in active development", recommends Spark). Push 2025-10-19 | MIT | Avoid for new work. |
| realism-effects | 1.1.2 | 2023-05-12 | 1,936 | >=0.148.0; postprocessing >=6.30.1 | No | Dead. Push 2024-02-04 | MIT | Avoid. |
| three-custom-shader-material | 6.4.0 | 2025-10-12 | 70,583 | >=0.159 | No. Issue "Support WebGPU?" (#82) closed as not planned on 2025-11-28 | Maintained for WebGL. Push 2025-10-12, 1 open | MIT | Extending built-in materials with GLSL on WebGLRenderer. Use TSL node materials on WebGPU. |
| lamina | 1.2.2 | 2025-06-21 | 5,188 | >=0.170; fiber >=8; react >=19 | No | Archived repo. README: archived 2023-04-05; a React 19 compatibility release followed in 2025 | MIT | Avoid. |
| stats-gl | 4.2.3 | 2026-07-10 | 4,358,305 (drei 10 pulls ^2.2.8) | optional, any | Yes in 4.x (CPU and GPU timing for WebGL and WebGPU). Older versions broke with r181 WebGPU (forum thread) | Maintained. Push 2026-07-10, 9 open | MIT | FPS, CPU and GPU timings. |
| three Inspector (`three/addons/inspector/Inspector.js`) | in three 0.186.1 | 2026-09-24 | in three | r181 and later | WebGPURenderer only | Introduced in r181. Tabs: Performance, Memory, Timeline, Console, Parameters, Viewer, Settings | MIT | Profiling and parameter panels in WebGPU apps (`renderer.inspector = new Inspector()`). |
| lil-gui | 0.21.0 | 2025-10-12 | 292,947 | none | n/a (DOM) | Stable. three bundles 0.17.0 in `examples/jsm/libs` | MIT | Vanilla debug panels. |
| tweakpane | 4.0.5 | 2024-11-03 | 346,784 | none | n/a (DOM) | Slow. Push 2026-03-15, 32 open | MIT | Richer vanilla panels with plugins. |
| @types/three | 0.186.0 | 2026-09-11 | 12,454,075 | tracks three 0.186.x | Types cover WebGPU and TSL | Active (DefinitelyTyped plus three-types). Depends on @dimforge/rapier3d-compat ~0.12.0, @tweenjs/tween.js ~23.1.3, meshoptimizer ~1.1.1, fflate, @types/webxr | MIT | Keep the minor equal to three's minor (0.186.x with three 0.186.1). |
| three-bvh-csg | 0.0.18 | 2026-02-17 | 135,073 | >=0.179.0; three-mesh-bvh >=0.9.7 | Unverified | Active. Used by three's `webgl_geometry_csg` | MIT | Fast boolean mesh operations. |
| @three.ez/batched-mesh-extensions (+ instanced-mesh 0.3.16) | 0.0.12 | 2026-06-23 | 489 (instanced-mesh 8,416) | >=0.159.0 | Has a WebGPU build (`build/webgpu.js`) | Active. Used by three's `webgl_batch_lod_bvh` | MIT | BatchedMesh LOD, BVH culling, per-instance data. |
| three.quarks | 0.17.1 | 2026-05-21 | 14,390 | >=0.182.0 | Unverified | Active. Push 2026-05-21, 10 open | MIT | Particle VFX system and editor format. |
| three-nebula | 13.3.0 | 2026-09-19 | 1,875 | >=0.122.0 <1.0.0 | Optional batched `GPURenderer` at `three-nebula/webgpu` | Revived: no release from 2021-11-05 (10.0.3) until 11.0.0 on 2026-07-17, then 12 and 13 in August and September 2026 | MIT | Particle systems with a WebGPU renderer option. |
| three-html-render | 0.1.2 | 2026-04-13 | 297 | >=0.150.0 | Yes (README: live HTML as WebGL or WebGPU textures) | New. Used by three's `webgl_materials_texture_html` and `webgpu_materials_texture_html` | MIT | HTML-in-canvas textures. |
| typegpu + @typegpu/three | 0.12.6 / 0.12.1 | 2026-09-25 / 2026-08-21 | 391,902 / 276 | @typegpu/three: >0.126.0 | `@typegpu/three` converts TypeGPU functions to and from TSL nodes. Docs say it needs WebGPU; @typegpu/gl 0.12.5 (WebGL utilities, created 2026-05-17) may change that (unverified) | Active (Software Mansion). Push 2026-09-26, 287 open | MIT | Typed WGSL and compute that plugs into TSL materials. |

## 9. Data visualization engines next to three

| package | latest | published | weekly downloads | three range | WebGPU | status | license | use for |
|---|---|---|---|---|---|---|---|---|
| plotly.js (and plotly.js-gl3d-dist-min) | 4.1.1 | 2026-09-14 | 822,617 (gl3d bundle 12,520; dist-min 571,692) | Not three.js (its own stack.gl-based WebGL) | n/a | Active. 4.0.0 (2026-08-24) changed `hoveranywhere` and `clickanywhere` event values (date and category axes now return strings), removed mapbox traces, switched color parsing to culori and changed the `geo.fitbounds` default. 796 open | MIT | Standard 3D charts (scatter3d, surface, mesh3d, isosurface, volume, cone) with hover and export. The gl3d bundle is 1.67 MB unpacked. |
| echarts-gl | 2.1.0 | 2026-05-28 | 85,170 | Not three.js (ClayGL); peer echarts ^5.1.2 or ^6.0.0 | n/a | First release since 2022 (ECharts 6 compatibility). 358 open | npm field MIT; GitHub reports BSD-3-Clause | 3D bars, scatter, surfaces and globes inside ECharts dashboards. |
| deck.gl (@deck.gl/core) | 9.4.0 | 2026-09-05 | 264,249 (core 1,031,503) | Not three.js (luma.gl) | Experimental WebGPU through luma.gl | Active. 550 open | MIT | Millions of points on maps. Mixing with three needs custom layers or a shared context, which is awkward. |
| globe.gl, 3d-force-graph | see section 8 | | | three >=0.179 <1 | | | MIT | The three.js-based options for globes and networks. |

## 10. Signals from three.js itself and from agent tooling

- **Libraries imported by official three.js dev examples** (import maps found by GitHub code search, 2026-09-26): three-mesh-bvh 0.9.10, three-bvh-csg 0.0.18, three-gpu-pathtracer 0.0.24, 3d-tiles-renderer 0.4.27 with postprocessing 6.39.1 and @takram three-clouds 0.7.6, three-atmosphere 0.19.1, three-geospatial 0.9.1, @three.ez/batched-mesh-extensions 0.0.11 with bvh.js 0.0.13 and meshoptimizer 1.1.1, @perplexdotgg/bounce 1.8.1 with monomorph 2.3.1, @needle-tools/gltf-progressive 3.2.0, @needle-tools/three-animation-pointer 1.0.7, three-good-godrays 0.12.0, three-html-render, three-subdivide 1.1.5, web-ifc 0.0.77, rhino3dm 8.32.1, @mediapipe/tasks-vision 0.10.35, lottie-web 5.13.0.
- **Physics addons in three r186**: RapierPhysics (loads @dimforge/rapier3d-compat 0.17.3 from cdn.skypack.dev), JoltPhysics (jolt-physics 1.0.0 from jsDelivr), AmmoPhysics (expects a global `Ammo`). Examples on the dev branch: 6 Rapier, 6 Ammo, 1 Jolt.
- **three r186 GLTFLoader** lists KHR_meshopt_compression and KHR_gaussian_splatting next to EXT_meshopt_compression, KHR_draco_mesh_compression and KHR_texture_basisu.
- **three r186 supports WebXR on WebGPURenderer.** The 0.186.1 XRManager handles both `XRWebGLBinding` and `XRGPUBinding`, and the dev examples include `webgpu_xr_cubes`, `webgpu_xr_native_layers`, `webgpu_xr_shadows` and `webgpu_xr_rollercoaster`. The XR libraries above have not followed yet.
- **Agent assets in libraries**: Needle Engine 5.1.13 ships `SKILL.md` (494 lines) in its npm tarball. @iwsdk/core 1.0.0 ships `dist/mcp` (scene, ECS and UI debug tools). pmndrs/claude-code-plugin (created 2026-08-09) bundles the `pmndrs` MCP server at `https://docs.pmnd.rs/api/mcp` (R3F, drei, zustand docs plus the examples gallery) and two skills. pmndrs/math installs a skill with `npx skills add pmndrs/math --skill math`. None of R3F, drei, lenis, gsap, Spark, glyph, uikit, model-viewer or the Spline runtime ship agent files in their npm packages.

---

## Legacy and replacements

| legacy library | evidence on 2026-09-26 | replace with |
|---|---|---|
| three-stdlib | Last release 2.36.1 (2025-11-10). drei 11 alpha no longer depends on it | `three/addons/*` from three itself (package export `./addons/*`) |
| lamina | Repo archived; README says archived on 2023-04-05 | TSL node materials (`colorNode`, `positionNode`) on WebGPURenderer; three-custom-shader-material on WebGL |
| cannon.js (`cannon`) | 0.6.2 from 2015 | Rapier or Jolt |
| cannon-es, @react-three/cannon, use-cannon | cannon-es 0.20.0 (2022-08-12); @react-three/cannon 6.6.0 (2023-08-17); use-cannon last push 2024-02-25 | @dimforge/rapier3d-compat 0.21.0, or @react-three/rapier 2.2.0 in React |
| ammo.js | No official npm release; the npm `ammo.js` 0.0.10 is from 2016. Commits resumed in 2026 without versioned builds | jolt-physics 1.1.0 (three JoltPhysics addon) or Rapier 0.21 (soft bodies) |
| @mkkellogg/gaussian-splats-3d | README says it is no longer in active development and recommends Spark | @sparkjsdev/spark 2.2.0, or three r186's native splat renderer |
| three-mesh-ui | npm 6.5.4 (2023-03-24); repo push 2023-12-03 | @pmndrs/uikit 1.0.76 (vanilla) or @react-three/uikit |
| @react-three/a11y | 3.0.0 (2022-05-15); only docs changes since | DOM-first accessibility: drei `Html` or CSS2DRenderer labels, an HTML data table, keyboard handlers, aria-live. No maintained 3D a11y library was found |
| @react-three/flex | 1.0.1 (2022-12-03) | @react-three/uikit |
| r3f-perf | 7.2.3 (2024-11-08); depends on drei ^9 | stats-gl 4 (drei `StatsGl`), three's Inspector (WebGPU), `renderer.info` |
| framer-motion-3d | Deprecated on npm; last 12.4.13 (2025-03-11) | GSAP, @react-spring/three, drei and maath easing helpers |
| @studio-freight/lenis | Deprecated on npm (renamed) | lenis |
| realism-effects | 1.1.2 (2023-05-12) | TSL SSGINode, SSRNode, GTAONode, TRAANode on WebGPU; n8ao on WebGL |
| Theatre.js public packages | 0.7.2 (2024-05-19); 1.0 developed privately | GSAP timelines. Keep Theatre only for designer keyframing, pinned |
| maath | Repo renamed to pmndrs/math; `math` 0.1.0 published 2026-09-11 | `math` once it reaches 1.0; maath stays inside drei 10 and 11 alpha |
| pmndrs postprocessing, @react-three/postprocessing, three EffectComposer (on WebGPU) | All WebGL only | RenderPipeline plus TSL display nodes; R3F v10 `useRenderPipeline` |
| troika-three-text (on WebGPU) | No WebGPU support; TSL port issue open | three-msdf-text-utils `MSDFTextNodeMaterial`; later @pmndrs/glyph |
| three-custom-shader-material (on WebGPU) | WebGPU support closed as not planned | TSL node materials |
| dat.gui, stats.js | dat.gui 0.7.9 (2022), stats.js 0.17.0 (2016) | lil-gui, stats-gl 4, three's Inspector |
| KTX-Software `toktx` | KTX-Software 5.0 removes the legacy tools | `ktx create` (KTX-Software 4.4 and later) |
| three-good-godrays on r183 and later | Peer range stops at 0.182.0 | GodraysNode (TSL) |
| angular-three on r183 and later | Peer range <0.183.0; Angular <22 | Pin three 0.182 and Angular 21, or wait for a new minor |

## Implications for threewright

**kb entries to write first** (one `kb/libraries/<slug>.md` each, following `kb/SCHEMA.md`: `package`, `version_checked` set to the version in the tables above, `renderer: webgl|webgpu|both|none` taken from the WebGPU column, `status`, `applies_to`, `last_verified: 2026-09-26`, and this note in `sources`):

1. `react-three-fiber.md`: v9.8.1 versus v10 alpha, React 19.3 peer caps, the async `gl` factory, `state.renderer`.
2. `drei.md`: v10 dependencies (three-stdlib, three-mesh-bvh 0.8, stats-gl 2) and the v11 entry points.
3. `gltf-transform.md`, `meshoptimizer-gltfpack.md`, `ktx2-tools.md`: the asset pipeline every scenario uses. Include the KTX-Software 4.4 requirement and the KHR_meshopt_compression gap in glTF Transform 4.5.
4. `rapier.md` (plus the @react-three/rapier lag) and `three-mesh-bvh.md`.
5. `post-processing.md`: pmndrs postprocessing 6.39 versus EffectComposer versus RenderPipeline with a WebGL or WebGPU decision table.
6. `gsap.md` (with the license note) and `lenis.md`.
7. `model-viewer.md`, `spark.md`, `3d-tiles-renderer.md` (plus takram).
8. Text: `troika-three-text.md`, `three-msdf-text-utils.md`, `glyph.md` (watch).
9. Charts: `plotly-3d.md`, `globe-gl.md`, `3d-force-graph.md`, `echarts-gl.md`, `deck-gl.md`.
10. Debug: `stats-gl.md`, `three-inspector.md`, `lil-gui.md`, `leva.md`; `types-three.md`.
11. Frameworks: `tresjs.md`, `threlte.md`, `iwsdk.md`, `aframe.md`, `needle-engine.md`, `angular-three.md`, `spline-runtime.md`.
12. Legacy stubs with `status: legacy` and `superseded_by` pointing at the replacement: every row of the legacy table. The "use for" column above maps to the `## Use it for` and `## Avoid it when` sections.

**Recommended defaults per scenario (2026-09-26)**

| scenario | vanilla default | React default | notes |
|---|---|---|---|
| 3D charts in docs | three 0.186.1 by import map, OrbitControls, CSS2DRenderer labels (troika for hundreds of labels) | R3F 9.8.1 + drei 10.7.9 (`Html`, `Text`) | plotly.js-gl3d-dist-min 4.1.1 when a stock chart type fits. globe.gl 2.46.2 for globes, 3d-force-graph 1.80.0 for networks, deck.gl 9.4.0 for huge geo layers. Always keep an HTML data table. |
| Product viewer | @google/model-viewer 4.3.1 for view plus AR; otherwise three + camera-controls 3.1.2 + GLTFLoader with Meshopt and KTX2 | R3F + drei `Stage`, `Environment`, `ContactShadows`, `Bounds` | Assets through @gltf-transform/cli 4.5.0 `optimize` or gltfpack 1.3.0, textures through KTX-Software 4.4+. three-gpu-pathtracer 0.0.24 for hero stills. |
| Scroll storytelling | gsap 3.15.0 + ScrollTrigger + lenis 1.3.26, one fixed canvas | R3F + drei `ScrollControls`, or GSAP driving R3F state | No Theatre.js unless a designer needs the editor. Lenis already honors reduced motion. |
| Video (deterministic capture) | Vanilla three with a fixed timestep; GSAP timelines scrubbed with `progress()` | R3F `frameloop="never"` plus `advance()` (v9) | Avoid libraries that read wall-clock time internally (Lenis, auto-rotating controls). Seed randomness. Step Rapier with a fixed dt. |
| Games | three + @dimforge/rapier3d-compat 0.21.0 + three-mesh-bvh 0.9.15, navcat 0.4.1 or recast-navigation 0.43.1 | R3F 9.8.1 + drei 10.7.9 + @react-three/rapier 2.2.0 + ecctrl 2.0.2 + zustand 5.0.15 (koota for ECS) | stats-gl 4.2.3 plus lil-gui or leva for tuning. jolt-physics 1.1.0 for heavy sims. postprocessing 6.39.5 on WebGL. |
| WebXR | IWSDK 1.0.0 (install `@iwsdk/core@1.0.0`, alias three to super-three 0.181.0) or core three WebXRManager | @react-three/xr 6.6.30 + @react-three/uikit 1.0.76 | A-Frame 1.8.0 for declarative HTML scenes. All of these render with WebGL today. |
| WebGPU and TSL projects | `three/webgpu`, RenderPipeline, TSL display nodes, Inspector, stats-gl 4, three-msdf-text-utils, three-mesh-bvh `/webgpu`, three-vrm `MToonNodeMaterial` | R3F 9.8.1 with the async `gl` factory now; R3F 10 plus drei 11 after they leave alpha | Scan every dependency for `onBeforeCompile` and GLSL `ShaderMaterial` before switching renderers. |
| Geospatial | 3d-tiles-renderer 0.5.3 + @takram/three-atmosphere 0.19.1 + @takram/three-clouds 0.7.6 | Same through `3d-tiles-renderer/r3f` | Clouds are WebGL only. |
| Gaussian splats | three r186 native splats (WebGPU and WebGL) | Spark 2.2.0 inside R3F (pattern unverified) | Spark for streaming LoD and very large scenes on WebGL2. |
| Avatars | @pixiv/three-vrm 3.5.5 | Same | WebGPU through `MToonNodeMaterial`. |

**Rules for `tw versions`**

- Store `latest` plus every dist-tag and the highest stable semver. Flag when `latest` is a prerelease (@needle-tools/engine 6.0.0-alpha.3, @needle-tools/gltf-progressive 4.0.0-alpha.3) or lower than a stable on another tag (@iwsdk/core 1.0.0 on `next`, troika-three-text 0.53.0 untagged).
- Check peer ranges against the current three (0.186.1), React (19.3.0), Angular (22.2.0) and Vite (8.3.1). Known flags today: angular-three (<0.183.0, Angular <22), model-viewer (^0.183.0), three-good-godrays (<=0.182.0), postprocessing v7 beta (<0.184.0), @enable3d/ammo-physics (pinned 0.171.0), R3F 10 alpha, drei 11 alpha, test-renderer 10 alpha and glyph (React <19.3), @iwsdk/vite-plugin-dev (Vite ^7). postprocessing 6.39.5 stops at <0.187.0, so r187 will need a new postprocessing release.
- Record embedded or aliased three versions: Needle (@needle-tools/three 0.169.19 stable), A-Frame (super-three 0.184.0), IWSDK (super-three 0.181.0), Spline (bundled, version unknown).
- Mark packages with no release in 12 months as "stale" and with no release in 24 months as "legacy" unless the kb says otherwise.
- Treat downloads as a weak signal. Note transitive inflation for rapier3d-compat, tween.js and meshoptimizer (via @types/three) and for three-stdlib, stats.js, meshline, maath, detect-gpu, camera-controls, troika and three-mesh-bvh (via drei 10).
- Data sources: the npm packument for versions and peers; the registry search API for weekly downloads when api.npmjs.org is blocked; GitHub search for repo status.

**Skill rules.** Prefer `three/addons/*` over three-stdlib. Before recommending WebGPURenderer, list dependencies that are WebGL only. Point agents to library-shipped agent assets (Needle SKILL.md, IWSDK MCP, the pmndrs docs MCP) instead of repeating their docs.

## Claims likely to change

- R3F 10 and drei 11 leaving alpha, and their React <19.3 caps.
- @react-three/rapier catching up to Rapier 0.20 and 0.21; the new Rapier soft-body API.
- postprocessing v7, its three cap, and any WebGPU plan; the v6 cap <0.187.0.
- WebGPU support in troika, @pmndrs/uikit, @react-three/xr, Spark, three-gpu-pathtracer, @takram/three-clouds, 3d-tiles-renderer and globe.gl (three-render-objects `useWebGPU`).
- @pmndrs/glyph reaching 1.0; `math` replacing maath in drei.
- IWSDK moving `latest` to 1.0.0 and its super-three pin; Needle 6.0 going stable and its three fork version.
- angular-three support for three r183+ and Angular 22; model-viewer's three peer.
- Theatre.js 1.0; lenis 2.0; @react-spring/three 11.
- KTX-Software 5.0 final and basis_universal 2.x (XUASTC) support in three's KTX2Loader (unverified).
- glTF Transform support for KHR_meshopt_compression and KHR_gaussian_splatting.
- GSAP license terms; Needle pricing.
- @types/three dependency pins (rapier 0.12, tween.js 23).
- deck.gl and luma.gl WebGPU status; plotly.js 4.x follow-ups.
- Weekly download numbers (they move every week).

## Search plan for next refresh

1. For every package in `kb/libraries`, fetch `https://registry.npmjs.org/<pkg>` and record `dist-tags`, publish times, peer ranges, `deprecated` and the license field.
2. Get weekly downloads from `https://registry.npmjs.org/-/v1/search?text=<pkg>&size=25` and match the exact name. Run requests one at a time. Retry api.npmjs.org in case the proxy allows it.
3. Batch GitHub repo status with `repo:a/b repo:c/d` search queries (about 12 repos per query). Save open counts so the next pass can report a trend.
4. Read release dates from `releases.atom` feeds. WebFetch summaries of release pages sometimes drop or guess the year.
5. Re-run the three.js checks: `examples/files.json`, code search for `cdn.jsdelivr.net/npm/` in `examples/*.html`, the physics addon CDN pins, and the GLTFLoader extension list.
6. List pmndrs repos pushed in the last four months (`org:pmndrs pushed:>YYYY-MM-DD`) to catch new packages early.
7. For WebGPU claims without docs, download the tarball and search for `three/webgpu`, `onBeforeCompile` and `ShaderMaterial`.
8. Read changelogs: dimforge/rapier `bindings/typescript/CHANGELOG.md`, glTF-Transform `CHANGELOG.md`, troika `CHANGELOG.md`, Needle `CHANGELOG.md` in the tarball, R3F and drei releases, the drei v11 migration guide.
9. Search terms: "three.js library 2027", "<library> WebGPU TSL", "<library> deprecated", "Codrops three.js", "three.js forum resources".
10. Hosts blocked this time (try again): api.npmjs.org, npmjs.com, npmtrends.com, threejs.org, discourse.threejs.org, threlte.xyz, gsap.com, utsubo.com, newreleases.io, threejsresources.com, gexpsoftware.com.

## Sources (URL plus date)

1. npm registry packuments, https://registry.npmjs.org/<package> (accessed 2026-09-26)
2. npm registry search API, `downloads.weekly`, https://registry.npmjs.org/-/v1/search?text=<package> (accessed 2026-09-26)
3. npm tarballs read for license, build and agent-file checks: gsap 3.15.0, @needle-tools/engine 5.1.13 and 6.0.0-alpha.3, @gltf-transform/cli and /extensions 4.5.0, @iwsdk/core 1.0.0, @pmndrs/uikit 1.0.76, @pmndrs/xr 6.6.30, @sparkjsdev/spark 2.2.0, angular-three 4.2.4, 3d-tiles-renderer 0.5.3, three-render-objects 1.42.0, globe.gl 2.46.2 and others, https://registry.npmjs.org (accessed 2026-09-26)
4. three 0.186.1 package source (RenderPipeline.js, PostProcessing.js, Clock.js, XRManager.js, GLTFLoader.js, examples/jsm/inspector, examples/jsm/tsl/display, examples/jsm/postprocessing, examples/jsm/physics, examples/jsm/libs), https://registry.npmjs.org/three/-/three-0.186.1.tgz (accessed 2026-09-26)
5. GitHub repository search API (stars, archived, pushed_at, open counts), https://api.github.com/search/repositories (accessed 2026-09-26)
6. three.js examples list, https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/files.json (accessed 2026-09-26)
7. three.js ballpool example (Bounce), https://github.com/mrdoob/three.js/blob/dev/examples/webgpu_postprocessing_ssgi_ballpool.html (accessed 2026-09-26)
8. three.js r181 release notes (Inspector, async method deprecation), https://github.com/mrdoob/three.js/releases/tag/r181 (accessed 2026-09-26)
9. React Three Fiber releases, https://github.com/pmndrs/react-three-fiber/releases (accessed 2026-09-26)
10. R3F v10.0.0-alpha.1 release, https://github.com/pmndrs/react-three-fiber/releases/tag/v10.0.0-alpha.1 (2026-01-17)
11. R3F v10.0.0-alpha.4 release, https://github.com/pmndrs/react-three-fiber/releases/tag/v10.0.0-alpha.4 (2026-08-24)
12. drei v10 to v11 migration guide, https://github.com/pmndrs/drei/blob/v11-working/devDocs/MIGRATION_V10_TO_V11.md (accessed 2026-09-26)
13. react-postprocessing releases, https://github.com/pmndrs/react-postprocessing/releases (accessed 2026-09-26)
14. postprocessing releases feed, https://github.com/pmndrs/postprocessing/releases.atom (accessed 2026-09-26)
15. postprocessing issue 419, render pipeline redesign, https://github.com/pmndrs/postprocessing/issues/419 (accessed 2026-09-26)
16. Rapier changelog (v0.36.0), https://github.com/dimforge/rapier/blob/master/CHANGELOG.md (2026-09-24)
17. Rapier JS bindings changelog (0.21.0, 0.20.0), https://github.com/dimforge/rapier/blob/master/bindings/typescript/CHANGELOG.md (2026-09-24)
18. rapier.js repository notice (merged into dimforge/rapier), https://github.com/dimforge/rapier.js (accessed 2026-09-26)
19. Dimforge blog, soft bodies in Rapier (title seen in search only), https://dimforge.com/blog/2026/09/25/advanced-soft-bodies-for-games-in-the-rapier-physics-engine/ (2026-09-25)
20. ecctrl 2.0 announcement, https://x.com/AndrewChenE/status/2066398990560837940 (2026-06-15)
21. TresJS WebGPU docs, https://docs.tresjs.org/api/advanced/web-gpu (accessed 2026-09-26, via search)
22. TresJS v5 announcement, https://tresjs.org/blog/tresjs-v5 (accessed 2026-09-26, via search)
23. Threlte WebGPU and TSL docs, https://threlte.xyz/docs/learn/advanced/webgpu/ (accessed 2026-09-26, via search; direct fetch blocked)
24. angular-three repository README, https://github.com/angular-threejs/angular-three (accessed 2026-09-26)
25. Immersive Web SDK README, https://github.com/facebook/immersive-web-sdk (accessed 2026-09-26)
26. Road to VR, IWSDK 1.0 coverage, https://roadtovr.com/meta-immersive-web-ai-agent-toolkit-2026/ (2026-09, via search)
27. A-Frame 1.8.0 blog, https://aframe.io/blog/aframe-v1.8.0/ (2026-06, via search)
28. A-Frame 1.7.0 blog (WebGPU and TSL), https://aframe.io/blog/aframe-v1.7.0/ (2025, via search)
29. VR.org, A-Frame 1.8.0 article, https://vr.org/articles/aframe-1-8-0-webxr-open-source-june-2026 (2026-06, via search)
30. Needle pricing, https://needle.tools/pricing/ (accessed 2026-09-26, via search)
31. model-viewer releases, https://github.com/google/model-viewer/releases (accessed 2026-09-26)
32. GSAP standard license, https://gsap.com/community/standard-license/ (accessed 2026-09-26, via search; gsap.com blocked)
33. Webflow, "Webflow makes GSAP 100% free", https://webflow.com/blog/gsap-becomes-free (2025, via search)
34. Lenis README, https://github.com/darkroomengineering/lenis (accessed 2026-09-26)
35. Theatre.js README, https://github.com/theatre-js/theatre (accessed 2026-09-26)
36. Motion upgrade guide (framer-motion-3d deprecation), https://motion.dev/docs/react-upgrade-guide (accessed 2026-09-26, via search)
37. pmndrs/math README (formerly maath), https://github.com/pmndrs/math (accessed 2026-09-26)
38. three-stdlib README, https://github.com/pmndrs/three-stdlib (accessed 2026-09-26)
39. troika changelog (0.53.0), https://github.com/protectwise/troika/blob/main/CHANGELOG.md (2026-07-24)
40. troika issue 359, conversion to TSL, https://github.com/protectwise/troika/issues/359 (accessed 2026-09-26)
41. pmndrs/glyph README, https://github.com/pmndrs/glyph (accessed 2026-09-26)
42. three-msdf-text-utils README, https://github.com/leochocolat/three-msdf-text-utils (accessed 2026-09-26)
43. pmndrs/uikit README and LICENSE, https://github.com/pmndrs/uikit (accessed 2026-09-26)
44. pmndrs/xr LICENSE, https://github.com/pmndrs/xr (accessed 2026-09-26)
45. three-mesh-ui README, https://github.com/felixmariotto/three-mesh-ui (accessed 2026-09-26)
46. glTF Transform changelog, https://github.com/donmccurdy/glTF-Transform/blob/main/CHANGELOG.md (accessed 2026-09-26)
47. meshoptimizer releases feed, https://github.com/zeux/meshoptimizer/releases.atom (accessed 2026-09-26)
48. KTX-Software tags, https://github.com/KhronosGroup/KTX-Software/tags (accessed 2026-09-26)
49. KTX-Software v4.4.2 release, https://github.com/KhronosGroup/KTX-Software/releases/tag/v4.4.2 (2025-10-04)
50. basis_universal releases feed, https://github.com/BinomialLLC/basis_universal/releases.atom (accessed 2026-09-26)
51. glTF-Validator releases feed, https://github.com/KhronosGroup/glTF-Validator/releases.atom (accessed 2026-09-26)
52. three-vrm README, https://github.com/pixiv/three-vrm (accessed 2026-09-26)
53. takram three-atmosphere WebGPU docs, https://github.com/takram-design-engineering/three-geospatial/blob/main/packages/atmosphere/WEBGPU.md (accessed 2026-09-26)
54. three-mesh-bvh WebGPU API, https://github.com/gkjohnson/three-mesh-bvh/blob/master/WEBGPU_API.md (accessed 2026-09-26)
55. three-gpu-pathtracer README, https://github.com/gkjohnson/three-gpu-pathtracer (accessed 2026-09-26)
56. 3DTilesRendererJS README, https://github.com/NASA-AMMOS/3DTilesRendererJS (accessed 2026-09-26)
57. Spark README, https://github.com/sparkjsdev/spark (accessed 2026-09-26)
58. Spark 2.0 features, https://sparkjs.dev/docs/new-features-2.0/ (accessed 2026-09-26, via search)
59. GaussianSplats3D README, https://github.com/mkkellogg/GaussianSplats3D (accessed 2026-09-26)
60. lamina README, https://github.com/pmndrs/lamina (accessed 2026-09-26)
61. three-custom-shader-material issue 82, "Support WebGPU?", https://github.com/FarazzShaikh/THREE-CustomShaderMaterial/issues/82 (closed 2025-11-28)
62. stats-gl README, https://github.com/RenaudRohlinger/stats-gl (accessed 2026-09-26)
63. three.js forum, "WebGPU r181: stats-gl no longer compatible with WebGPU", https://discourse.threejs.org/t/webgpu-r181-fyi-stats-gl-no-longer-compatible-with-webgpu/87944 (2025, via search)
64. n8ao README, https://github.com/N8python/n8ao (accessed 2026-09-26)
65. r3f-perf issues 59, 62, 63, 66, 67, https://github.com/utsuboco/r3f-perf/issues (accessed 2026-09-26)
66. leva issue 483, "Is this project alive?", https://github.com/pmndrs/leva/issues/483 (accessed 2026-09-26)
67. react-three-a11y commit history, https://github.com/pmndrs/react-three-a11y/commits/main (accessed 2026-09-26)
68. cannon-es commit history, https://github.com/pmndrs/cannon-es/commits/master (accessed 2026-09-26)
69. ammo.js commit history, https://github.com/kripken/ammo.js/commits/main (accessed 2026-09-26)
70. Bounce repository, https://codeberg.org/perplexdotgg/bounce (README read from npm, accessed 2026-09-26)
71. crashcat README, https://github.com/isaac-mason/crashcat (accessed 2026-09-26)
72. navcat README, https://github.com/isaac-mason/navcat (accessed 2026-09-26)
73. TypeGPU three integration docs, https://docs.swmansion.com/TypeGPU/ecosystem/typegpu-three/ (accessed 2026-09-26, via search)
74. plotly.js v4.0.0 release, https://github.com/plotly/plotly.js/releases/tag/v4.0.0 (2026-08-24, via search)
75. echarts-gl releases, https://github.com/ecomfe/echarts-gl/releases (accessed 2026-09-26, via search)
76. deck.gl what's new, https://deck.gl/docs/whats-new (accessed 2026-09-26, via search)
77. deck.gl WebGPU guide, https://deck.gl/docs/developer-guide/webgpu (accessed 2026-09-26, via search)
78. pmndrs Claude Code plugin README, https://github.com/pmndrs/claude-code-plugin (accessed 2026-09-26)
79. pmndrs react-three-examples README, https://github.com/pmndrs/react-three-examples (accessed 2026-09-26)
80. pmndrs on X, R3F v10 preview, https://x.com/pmndrs/status/2093370902461182190 (2026, via search)
81. Utsubo, "Migrate Three.js to WebGPU (2026)", https://www.utsubo.com/blog/webgpu-threejs-migration-guide (2026, via search snippets; fetch blocked)
82. GitHub org search, `org:pmndrs pushed:>2026-05-01`, https://github.com/pmndrs (accessed 2026-09-26)
