# Three.js scenarios in between, WebXR, testing and agent token efficiency

Date: 2026-09-26
Track: research for threewright (evergreen three.js skill plugin and knowledge base)
Status: first pass. Claims marked "unverified" were not confirmed against a primary source.

## Summary

Three.js in late 2026 sits on r186 (released September 2026). WebGPURenderer with TSL is production ready and falls back to WebGL2. The llms.txt at threejs.org now tells agents to use import maps, default to WebGLRenderer for compatibility, and use TSL for custom materials.

The biggest shifts for the "in between" scenarios:

- Gaussian splats became mainstream. KHR_gaussian_splatting is now ratified by Khronos. Three.js r186 ships a native TSL splat renderer and loader (PLY, SPLAT, SPZ, KSPLAT, glTF). Spark 2.0 (World Labs, April 2026) adds streaming LoD and a .RAD format. GaussianSplats3D is no longer developed and points users to Spark.
- Ready Player Me shut down on 2026-01-31 after Netflix bought it. VRM through @pixiv/three-vrm is the durable open avatar path.
- GSAP is free for all uses (Webflow sponsorship). GSAP ScrollTrigger plus Lenis is the default scroll storytelling stack.
- WebXR runs on Quest Browser, Chrome on Android and Android XR (Samsung Galaxy XR), and Safari on visionOS (immersive-vr only). iPhone Safari still has no WebXR, so iOS AR means AR Quick Look with USDZ.
- Meta's IWSDK (three.js plus ECS) now ships an MCP runtime with 45 tools for agents, including screenshots, console capture and headless deterministic runs.
- Chrome removed the automatic SwiftShader fallback. Headless WebGL tests now need `--enable-unsafe-swiftshader` or a real GPU.
- Claude's vision docs now state image cost as `ceil(w/28) * ceil(h/28)` visual tokens (about w*h/784, the old rule of thumb was w*h/750). Claude 4.7 and later accept up to 2576 px on the long edge and 4784 tokens per image, so a full HD screenshot costs about 2.7k tokens.

For agents, the cheapest reliable verification loop is: structural text checks first (console errors, renderer.info counts, scene graph dump, glTF validation), then one small screenshot only when the question is visual.

---

## Half A: the "everything in between" scenarios

### A1. Marketing hero sections and scroll-driven 3D storytelling

**Stack (2026).** Vanilla: three.js plus GSAP 3 with ScrollTrigger plus Lenis for smooth scroll. React: R3F with drei `ScrollControls` and `useScroll`, or R3F plus GSAP timelines driven by ScrollTrigger. Page transitions: the View Transitions API. Cross-document view transitions work in Chrome, Edge, Opera and Firefox by mid 2026, but MDN still marks `@view-transition` as not Baseline (Safari gap, unverified in detail). Astro plus Barba.js is a common pairing for multi-page WebGL galleries (Codrops, Feb 2026).

**Key techniques.**
- One persistent canvas, fixed behind the DOM. Never one canvas per section.
- Drive a GSAP timeline from scroll progress and scrub camera and material uniforms. Keep scroll logic out of the render loop; read a progress value in the loop.
- Sync Lenis to the GSAP ticker (`gsap.ticker.add(time => lenis.raf(time * 1000))`) and call `ScrollTrigger.update` on Lenis scroll. Run one rAF loop only.
- drei `ScrollControls` creates an HTML scroll container over the canvas; `pages` sets its height in viewport units. Use `useScroll().range()` and `curve()` to map sections.
- Render on demand when idle (`frameloop="demand"` in R3F) and pause the loop when the canvas is off screen (IntersectionObserver).
- Swap the canvas for a poster image or video until the GLB is ready, so LCP is an image, not WebGL.

**Pitfalls.** Two rAF loops fighting (Lenis plus R3F plus GSAP). Scroll hijacking that breaks keyboard and screen readers. Uncapped devicePixelRatio on phones. Loading a 20 MB hero model before first paint. Shader compile hitches on first scroll (precompile with `renderer.compile` or `compileAsync`).

**Performance budgets.** Mobile target about 100 draw calls and under 100k vertices (Don McCurdy's rule, quoted by Utsubo, Sept 2026). Cap DPR at 2 (1.5 on low end phones). Textures 2048 px max except the hero, KTX2 (ETC1S for color, UASTC for normals). Hero GLB compressed with Meshopt or Draco; aim for a few MB total (threewright suggestion: under 3 MB for the above-the-fold model, unverified as an industry number).

**Mobile fallbacks and reduced motion.** Check `matchMedia('(prefers-reduced-motion: reduce)')`. With it set, disable scroll scrubbing and camera flights, show the final state, and stop autoplay. Also offer a static image path when WebGL2 is missing or `renderer.capabilities` looks weak. Test reduced motion in Playwright with `page.emulateMedia({ reducedMotion: 'reduce' })`.

**Examples.**
- darkroomengineering/lenis (smooth scroll, maintained): https://github.com/darkroomengineering/lenis
- Codrops "Scroll-Revealed WebGL Gallery with GSAP, Three.js, Astro and Barba.js" (2026-02-02).
- drei ScrollControls docs and examples.

### A2. Product viewers and configurators

**Stack.** Two paths.
- `<model-viewer>` (Google, current 4.3.1, built on three.js) when the job is "show a GLB, allow AR, maybe swap variants". It gives WebXR and Scene Viewer on Android and AR Quick Look on iOS, PBR Neutral tone mapping by default since v4, and `variantName` / `availableVariants` for KHR_materials_variants. v4.3.0 added multi-model scenes.
- Raw three.js or R3F when you need custom UI, custom shaders, many parts, or a real configurator with rules and pricing.

**Key techniques.**
- Author variants in one GLB with KHR_materials_variants. Three.js supports it through the GLTFLoader variants plugin (example `webgl_loader_gltf_variants`, Shopify shoe). glTF Transform has a `KHRMaterialsVariants` class for building and editing variants in a pipeline.
- Image based lighting: an HDR or EXR environment through PMREM, or a small studio environment (RoomEnvironment) for fast loads. Use `AgXToneMapping` or `NeutralToneMapping` for product color accuracy.
- Contact shadows or baked shadow planes instead of real-time shadow maps.
- iOS AR: export USDZ. model-viewer can generate USDZ on the fly or take a pre-made `ios-src`; three.js has `USDZExporter`. Pre-authored USDZ is more reliable for materials (unverified comparison).
- Keep variant textures lazy: load only the selected variant's textures.

**Pitfalls.** Color mismatch from wrong color space on textures (sRGB for base color only). HDRs of 10 to 30 MB. Variants that duplicate geometry instead of materials. Tone mapping that shifts brand colors.

**Budgets.** Hero product GLB 1 to 5 MB with KTX2. Environment map 1k HDR or prefiltered. 60 fps on a mid phone with one draw call per material.

**Examples.**
- google/model-viewer (Apache 2.0): https://github.com/google/model-viewer
- three.js `webgl_loader_gltf_variants` example.
- Khronos KHR_materials_variants spec and the Khronos 3D Commerce blog post.

### A3. Architecture, real estate walkthroughs, digital twins, BIM and CAD

**Stack.** That Open Engine: `web-ifc` (WASM IFC read and write), `@thatopen/components` (BIM toolkit on three.js), and `@thatopen/fragments` (Fragments 2, a FlatBuffers based format). That Open claims a 2 GB IFC becomes about 80 MB of Fragments and loads over 10x faster, with worker based loading. For real estate and photoreal interiors: baked lighting in Blender, GLB with lightmaps, or a Gaussian splat capture of the space. For CAD: convert STEP to glTF offline (for example with OpenCascade based tools; occt-import-js is a common WASM option, unverified status).

**Key techniques.**
- Convert IFC to Fragments ahead of time on a server. Do not parse multi hundred MB IFC in the user's browser.
- Instancing and merging by material. BIM models have huge repeated element counts.
- Clipping planes and section boxes, measurement tools, property lookup by expressID.
- Walkthrough navigation: pointer lock or click to teleport, collision against a simplified proxy mesh (three-mesh-bvh).
- Digital twins: stream sensor data over WebSocket and update per-instance colors, not materials.

**Pitfalls.** Float precision far from origin (rebase coordinates, especially with georeferenced BIM). Memory blowups from per-element meshes. IFC files with broken geometry.

**Examples.**
- ThatOpen/engine_web-ifc: https://github.com/thatopen/engine_web-ifc
- ThatOpen/engine_components and engine_fragment.
- Fragments tutorials at docs.thatopen.com.

### A4. Maps and geospatial in 3D

**Stack.**
- 3DTilesRendererJS (NASA-AMMOS, npm `3d-tiles-renderer`) for 3D Tiles in three.js, Babylon.js and R3F. Plugins include `GoogleCloudAuthPlugin` (Google Photorealistic 3D Tiles), `CesiumIonAuthPlugin` (Cesium ion), and `GlobeControls`. Three.js ships an official example `webgl_loader_3dtiles` (3D tiles plus clouds).
- takram three-geospatial (`@takram/three-atmosphere`, `@takram/three-clouds`) for physically based sky and volumetric clouds over tiles.
- globe.gl, three-globe and react-globe.gl (vasturiano) for data globes: arcs, points, hexbins, clouds.
- MapLibre GL JS custom layers with three.js: official examples cover a 3D model, a model on terrain, a model with shadow, a model on the globe, and 3D tiles through 3DTilesRendererJS. maplibre-three-plugin bridges both.
- deck.gl for big data layers. deck.gl can interleave with MapLibre; mixing deck.gl and three.js in one GL context is possible but awkward (unverified best practice; prefer one owner of the GL context).

**Key techniques.** ECEF or local ENU frames with a rebased origin to avoid float jitter. Attribution overlays are required by Google tiles terms. Tile error target and LRU cache sizes set the memory budget. Logarithmic depth buffer or reversed depth for globe scale.

**Pitfalls.** Google Map Tiles API needs a key, billing and attribution; session tokens expire. Tiles plus clouds can exceed mobile memory. Custom layer render order and depth sharing in MapLibre.

**Examples.**
- NASA-AMMOS/3DTilesRendererJS: https://github.com/NASA-AMMOS/3DTilesRendererJS
- takram-design-engineering/three-geospatial.
- vasturiano/globe.gl.

### A5. Gaussian splats in 2026

**Where they stand.** Splats are now a standard asset type.
- KHR_gaussian_splatting: release candidate announced February 2026, now "Complete, Ratified by the Khronos Group" per the spec README. Implementations listed include CesiumJS and Cesium Native. Compression is left to companion extensions.
- Three.js r186 includes a native Gaussian splat renderer and loader in TSL for WebGPU and WebGL, with spherical harmonics, frustum culling, raycasting and a GPU counting sort. Loaders: PLY, SPLAT, SPZ, KSPLAT and glTF. Merged August 10, 2026, by Ben Houston's work (Radiance Fields newsletter).
- Spark (World Labs, sparkjsdev/spark) remains the most capable three.js splat engine. Spark 2.0 (2026-04-14) adds continuous LoD with splat budgets of 500k to 2.5M, progressive coarse-to-fine streaming, a 16M splat GPU virtual memory pool with LRU paging, and a new .RAD format. WebGL2, runs on desktop, iOS, Android and Quest. Rust compiled to WASM for background work.
- GaussianSplats3D (mkkellogg) README says it is no longer in active development and recommends Spark.

**Formats.**
- .ply: raw training output, huge.
- .splat: older compact format, no spherical harmonics.
- .ksplat: GaussianSplats3D format.
- .spz: Niantic open format, ZSTD compressed quantized attributes, about 10x smaller than PLY. Called the "betting favourite" default delivery format.
- .sog: PlayCanvas Spatially Ordered Gaussians, about 15 to 20x smaller than PLY, WebP based, with a streamed LoD variant. Tool: playcanvas/splat-transform CLI and SuperSplat editor.
- .rad: Spark 2.0 streaming format.
- glTF with KHR_gaussian_splatting for pipelines that mix meshes and splats.

**Pitfalls.** Sorting cost scales with count; budget splats per device. Transparency does not compose well with mesh transparency. Lighting cannot change on baked splats. Large PLY downloads.

**Budgets.** Mobile about 0.5 to 1M visible splats, desktop 2 to 3M (derived from Spark 2.0 budgets; treat as guidance).

**Examples.** sparkjsdev/spark, playcanvas/splat-transform, three.js r186 splat examples.

### A6. Scientific and medical visualization

**Volume rendering.** Three.js has `Data3DTexture` and raymarching examples (WebGL2 `webgl2_materials_texture3d`, WebGPU `webgpu_volume_cloud`), and WebGPU has a volume node material (unverified name `VolumeNodeMaterial`). For clinical grade neuroimaging, NiiVue (WebGL2, not three.js) is the specialist tool (unverified 2026 status). Use 16-bit or float 3D textures with transfer functions in a 1D lookup texture. Early ray termination and empty space skipping keep it fast.

**Molecules.** Mol* (molstar, PDBe and RCSB PDB) is the reference web viewer and uses its own WebGL renderer. 3Dmol.js is a lighter WebGL library forked from GLmol (which used three.js). NGL is legacy. For custom three.js molecular art: instanced spheres and cylinders, or impostor sphere shaders.

**Point clouds.** Potree 1.8 (WebGL, three.js) is still the common viewer for massive clouds. Potree-Next (m-schuetz) is a WebGPU rewrite that will replace it once mature. potree-core 2.0 and pnext/three-loader wrap Potree loading for plain three.js. COPC (Cloud Optimized Point Cloud) is the rising streaming format. voxelkloud/view is a newer three.js WebGPU point renderer (small project, unverified maturity).

**Pitfalls.** Float precision in scanner coordinates. Point size attenuation. Memory with uncompressed volumes.

**Examples.** potree/potree, m-schuetz/Potree-Next, molstar/molstar.

### A7. Generative art and creative coding

**Stack.** Three.js WebGPURenderer with TSL for shader art and compute (particles, fluid, reaction diffusion). TSL compiles to WGSL or GLSL, so one piece runs on WebGPU and WebGL2. Maxime Heckel's "Field Guide to TSL and WebGPU" and the Makio64 advanced TSL repo are strong references.

**Determinism.** Platforms like fxhash require the same output for the same hash. Use `$fx.rand()` (seeded by the token hash) and `$fx.randAt()` for lineage. Never call `Math.random()`, `Date.now()` or frame time in the generative step. Seed a PRNG (sfc32, mulberry32) from the hash for GPU noise too. Render at a fixed internal resolution and scale for the preview capture. GPU float differences across vendors can still change pixels, so keep the composition logic on the CPU and deterministic.

**Pitfalls.** Frame rate dependent motion. Canvas preview capture timing. Different results across WebGPU and WebGL backends.

**Examples.** fxhash docs "Programming open-form genart", Codrops TSL tutorials (for example the MSDF "Gommage" effect, Jan 2026), three.js webgpu_* examples.

### A8. WebXR in 2026

**Support.**
- Meta Quest Browser: the most complete target. immersive-vr, immersive-ar with passthrough, hand tracking, anchors, plane and mesh detection, layers. Default 72 or 90 fps depending on device.
- Chrome on Android phones and on Android XR (Samsung Galaxy XR): WebXR supported.
- Safari on visionOS 2 and later: WebXR on by default for immersive-vr, with gaze and pinch input (transient pointer) and hand tracking. immersive-ar is not enabled.
- Safari on iPhone and iPad: no WebXR. Some articles claim inline AR on iOS 18; treat that as wrong or unverified. For iPhone AR, use AR Quick Look (USDZ) or model-viewer.
- WebXR was proposed as an Interop 2026 focus area (VR.org, June 2026). Whether it was accepted and which features are scored is unverified.

**Frameworks.**
- Three.js core `WebXRManager` plus `XRButton`, `XRControllerModelFactory` and `XRHandModelFactory`. r186 added MSAA for XR layers and WebGPU XR camera fixes.
- @react-three/xr v6 (pmndrs): store based, R3F event handlers on XR pointers, less boilerplate. Works with pmndrs/uikit.
- Meta IWSDK (Immersive Web SDK, MIT, launched Meta Connect 2025): three.js plus ECS, XR input with hands, locomotion, grabbing, spatial audio, Havok physics, scene understanding, spatial UI (UIKitML). `npm create @iwsdk@latest`. IWER emulator runs XR in a desktop browser. Its MCP runtime (see Half B) is the most complete agent tooling for any three.js based stack found.

**Performance.** Quest apps are usually fill rate bound. Use fixed foveated rendering (`renderer.xr.setFoveation`), multiview where supported, one directional or point light with PBR, KTX2 textures, no heavy post processing, lower framebuffer scale if needed. Frame rate can be raised via `updateTargetFrameRate`.

**Pitfalls.** Designing for controllers only (Vision Pro has no controllers). Forgetting `optionalFeatures: ['hand-tracking']`. DOM overlays that do not exist in VR. Testing only in desktop emulation.

**Examples.** facebook/immersive-web-sdk, pmndrs/xr, three.js webxr_* examples.

### A9. 3D text, typography and UI in 3D

**Options.**
- troika-three-text: SDF text generated in a worker from TTF, OTF and WOFF. Mature for WebGL. WebGPU and TSL compatibility has been a gap (forum threads); check before choosing it for WebGPURenderer.
- Three MSDF Text (Leo Menard, unverified author name) has an `MSDFTextNodeMaterial` for TSL and WebGPU (Codrops Jan 2026).
- pmndrs text engine, now published as `@pmndrs/glyph` (repo pmndrs/text, pre-release): Wasm shaping and layout, then Bitmap, MSDF/MTSDF or Slug vector rendering, WebGPU first with WebGL2 through WebGPURenderer, TSL and TypeGPU shaders, adapters for three, React and Vue. Promising but pre-release.
- pmndrs/uikit: flexbox UI (buttons, inputs, scroll, theming) for R3F and vanilla three.js, used for XR panels.
- `TextGeometry` for extruded display type only. It is heavy; prefer SDF for body text.
- HTML overlays (drei `Html`, CSS2DRenderer) when text must be accessible and selectable.

**Pitfalls.** Font atlas size and CJK glyph coverage. SDF blur at small sizes. Z-fighting of text on panels. Accessibility: 3D text is invisible to screen readers, so mirror it in the DOM.

### A10. Avatars and characters

**Status.**
- Ready Player Me shut down on 2026-01-31 (Netflix acquisition announced 2025-12-19). Avatar creator, PlayerZero and developer APIs are offline. GLBs already exported still work; hosted avatar URLs do not. Any threewright template must not depend on RPM URLs.
- Union Avatars went offline July 2026 and Spatial announced closure July 2026 (Avatar SDK blog, vendor source).
- Alive: VRoid Studio (free VRM authoring), Avaturn, MetaPerson (Avatar SDK), Genies (Unity), MetaHuman (Unreal only), Character Creator.

**Stack.** @pixiv/three-vrm for VRM 0.x and 1.0: humanoid bones, expressions (blend shapes), look-at, spring bones, MToon toon material. For WebGPURenderer use `MToonNodeMaterial` via `MToonMaterialLoaderPlugin` (needs r167 or later). Animation retargeting: Mixamo FBX to VRM via the three-vrm examples; VRMA (VRM animation) files via `@pixiv/three-vrm-animation`.

**Pitfalls.** VRM 0.x models face -Z (rotate 180 degrees or use `VRMUtils.rotateVRM0`). Spring bones jitter at variable dt. Many skinned meshes blow the draw call budget; merge and use `VRMUtils.combineSkeletons` (unverified name) and texture atlases.

**Examples.** pixiv/three-vrm, VRoid Hub sample models.

---

## Half B: testing and verifying three.js code, and token efficiency for agents

### B1. How three.js itself tests

- **Scripts (package.json, dev branch).** `test` runs lint plus `test-unit` plus `test-unit-addons`. Unit tests run in a real browser through Puppeteer (`node test/unit/puppeteer.unit.js --testPage=UnitTests.html`), with headful variants. `test-e2e` runs `node test/e2e/puppeteer.js`. `test-e2e-webgpu` adds `--webgpu`. `make-screenshot` runs with `--make` to regenerate references. `test-treeshake` uses Rollup to check tree shaking. Puppeteer is `^25`.
- **E2E screenshot test.** Loads each example with `waitUntil: 'networkidle0'`, waits for 2 s network idle, allows about 1 s per MB of page data, then captures at 400x250 (rendered at 2x then downscaled). A deterministic injection replaces `Math.random()` and disables WebGPU timestamp queries. Comparison: per-pixel threshold 0.1, fail when more than 0.1 percent of pixels differ, diff images written on failure. About 50 examples are on an exception list (timing, black screens, hardware needs). WebGPU device loss restarts the browser.
- **CI (GitHub Actions).** ubuntu-latest, Node 24. The e2e job is a matrix of 5 shards (`CI=0..4`), installs Vulkan drivers and xvfb, runs under `xvfb-run -a`, 30 minute timeout, uploads `test/e2e/output-screenshots` as artifacts on every run.
- **r186 testing changes.** Large new TSL GPU unit test coverage (math, packing, conversions, color, tone mapping, procedural helpers). Tests now import unbuilt source directly.

Lesson for threewright: tiny screenshots (400x250), a fixed random seed, a render-settled wait, and a percentage pixel budget are enough to catch regressions across hundreds of examples.

### B2. Unit tests for three.js logic in Node

- **What works in Node without WebGL.** Math (Vector3, Matrix4, Quaternion, Box3, Ray), scene graph operations, `Object3D.traverse`, raycasting against geometry, animation mixers stepped by hand, BufferGeometry building, loaders that parse buffers (GLTFLoader.parse with a buffer, with texture loading stubbed). Vitest in `node` environment is fine for these.
- **jsdom limits.** jsdom has no WebGL. `canvas.getContext('webgl2')` returns null, so `new WebGLRenderer()` throws. Options: do not construct a renderer in unit tests (inject it); use a canvas mock package (vitest-webgl-canvas-mock or jest-webgl-canvas-mock, unverified maintenance status); or move render tests to a real browser.
- **headless-gl (`gl` on npm).** WebGL 1.0.3 only. Three.js removed WebGL1 support in r163, so headless-gl cannot run the current WebGLRenderer. Treat it as dead for three.js.
- **Mocking WebGLRenderer.** Keep render calls behind a thin interface and pass a fake with `render`, `setSize`, `info` and `dispose`. Assert on what you asked to render, not on pixels.
- **Vitest browser mode.** Stable in Vitest 4 with a Playwright provider. It runs tests in real Chromium, Firefox or WebKit, so WebGL and WebGPU work. This is the 2026 default for "unit tests that need a context".
- **@react-three/test-renderer.** Renders R3F trees without WebGL and exposes the scene graph (`scene.children`, `fireEvent`, `advanceFrames`). Latest 9.1.1. Its React peer range lagged React 19.3 and R3F v10 (alpha); check the peer range before adopting. With Vitest, make sure `module` resolves before `main` to avoid two copies of three.

### B3. Visual regression with Playwright

- `expect(page).toHaveScreenshot()` with `threshold` (per-pixel YIQ tolerance, default 0.2) and `maxDiffPixelRatio` or `maxDiffPixels`. For WebGL canvases use about 0.01 to 0.02 `maxDiffPixelRatio`. Three.js itself uses a stricter 0.1 threshold and 0.1 percent pixels, but on a pinned renderer.
- Remove nondeterminism: freeze time (`page.clock`), seed or replace `Math.random`, pass a fixed `dt` to animation, disable autoplay, `emulateMedia({ reducedMotion: 'reduce' })`, wait for a real ready signal (`window.__ready === true` set after the first frame that follows asset load) with `page.waitForFunction`, and screenshot the canvas locator only.
- Set `preserveDrawingBuffer: true` or capture right after a render call when reading pixels with `toDataURL` (standard WebGL behavior; the test harness guides above do not cover it).
- Store baselines per platform. Linux CI images differ from macOS and Windows. Generate baselines in the same Docker image as CI (the Playwright image).
- pixelmatch is the underlying diff library many harnesses use; three.js uses its own comparison with the same idea.

### B4. SwiftShader, GPUs and GitHub Actions

- Chrome deprecated and then removed the automatic WebGL fallback to SwiftShader (warning since Chrome 130). On machines without a GPU, WebGL now fails unless you pass `--enable-unsafe-swiftshader`. Playwright or Puppeteer launch args for deterministic software rendering: `--use-angle=swiftshader --enable-unsafe-swiftshader` (plus `--use-gl=angle` on some versions, unverified).
- SwiftShader is deterministic across runs but slow. One team measured 30 s canvas startup and 5+ minute suites, with flakiness from timeouts (Dave Snider, 2026-02-23).
- Alternatives: GitHub GPU runners (Tesla T4) with headed Chromium under xvfb, `--use-angle=vulkan`, and loaded NVIDIA kernel modules. That cut canvas load to under 1 s and total time to 1.4 minutes, at 3 to 4x the per-minute price. Three.js uses xvfb plus Vulkan (Mesa lavapipe likely, unverified) on ubuntu-latest.
- WebGPU in CI: `--enable-unsafe-webgpu --enable-features=Vulkan` as in three.js e2e. SwiftShader also provides a Vulkan backend for WebGPU in Chromium (unverified for headless on GitHub runners).
- Pin one renderer per baseline set. Differences across ANGLE backends are the main source of "passes locally, fails in CI".

### B5. Structural checks without a browser (or without looking)

- **renderer.info.** WebGLRenderer: `info.render.calls`, `triangles`, `points`, `lines`, `frame`; `info.memory.geometries`, `textures`; `info.programs`. WebGPURenderer: `info.render.drawCalls` (with `render.calls` counting render() calls), `info.compute.calls`, `info.memory` by resource type. Set `info.autoReset = false` and call `info.reset()` once per frame when there are multiple passes. Rising memory counts across scene swaps mean a leak (missing `dispose`).
- **Scene graph dump.** Traverse and print one line per node: depth indent, type, name, visible, children count, geometry vertex count, material type, texture sizes. Cap depth and collapse repeated siblings ("Mesh x240 'bolt'"). This is also what the threejs-devtools-mcp "smart labeled screenshot" does visually: it groups duplicates.
- **glTF validation.** Khronos glTF-Validator writes a JSON report with issues and stats (npm `gltf-validator`, API only, no CLI). glTF Transform CLI 4.5.0: `gltf-transform validate` and `gltf-transform inspect` (tables of scenes, meshes, materials, textures, animations with sizes). `optimize` for Meshopt or Draco plus KTX2 or WebP. Run `gltf-transform help inspect` for current flags; a `--format` option exists for inspect (md, csv, pretty) per the issue tracker (unverified exact values).
- **Static checks.** ESLint plus TypeScript with `@types/three`. Grep for outdated patterns (`three.min.js` script tags, `Geometry`, `outputEncoding`, `sRGBEncoding`, `WebGL1Renderer`), which llms.txt flags as the most common LLM mistakes.

### B6. Token efficiency for AI agents working on 3D

**Image math for Claude (docs, current).** Each 28x28 patch is one visual token, so cost is `ceil(width/28) * ceil(height/28)`. That is about w*h/784. The older published rule was w*h/750; both give similar numbers. Limits: standard tier 1568 px long edge and 1568 tokens; high resolution tier (Claude 4.7 and later) 2576 px and 4784 tokens. Oversized images are downscaled, except screenshots returned through computer use or browser use tool results, which are rejected when over the limit.

| Screenshot | Tokens (patch formula) |
| --- | --- |
| 320x180 | 84 |
| 400x250 (three.js e2e size) | 135 |
| 640x360 | 299 |
| 1280x720 | 1196 |
| 1920x1080 on 4.7+ | 2691 |
| 3840x2160 on 4.7+ | 4784 (downscaled) |

Images also stay in history. Every later turn resends them (base64 bytes and tokens) unless the harness compacts. Ten full HD screenshots in a debugging loop cost about 27k tokens of context before any code.

**Practices.**
1. Text first. Capture console errors and warnings only (filter by level), plus `renderer.info` numbers, plus a compact scene graph dump. Most bugs (black screen, missing model, shader compile error, NaN bounding box, camera inside the object, wrong color space) show up in text.
2. Screenshot only for visual questions, at 400 to 640 px wide, canvas element only, JPEG or WebP for photos of scenes, PNG for UI. Crop to the region in question rather than shrinking text into mush.
3. Save screenshots to disk and pass a path; read the file only when needed. This is the Playwright CLI design. Microsoft's `@playwright/cli` (early 2026) returns paths instead of image bytes and accessibility trees; Playwright's own benchmark was about 27k tokens versus about 114k for the same task through Playwright MCP.
4. Compare with a diff, not with eyes. Let pixelmatch or toHaveScreenshot decide pass or fail and only show the model the diff image (small) when it fails.
5. Keep binaries out of context. Never `cat` a GLB, HDR, EXR, KTX2 or base64 data URI. Summarize with `gltf-transform inspect` and file sizes. Add these extensions to agent ignore files.
6. Compact API references. Load `https://threejs.org/docs/llms.txt` (a small index with rules for LLMs) and fetch `llms-full.txt` sections only when needed, never whole.
7. Use scene inspection tools that answer questions in text:
   - IWSDK MCP runtime (`iwsdk-runtime`, v0.5.3, 45 tools, updated 2026-09-04): screenshots, console log capture, hierarchy and transform inspection, XR session and hand input emulation, ECS stepping and snapshots, reload. Has "collaborate" (headed) and "agent" (headless, deterministic) modes. `npx iwsdk mcp inspect` lists the tools.
   - threejs-devtools-mcp (DmitriyGolub, MIT, 59 tools): hooks a running page through a Chrome DevTools bridge on port 9222; object, material, shader, texture, animation, performance and memory tools; labeled screenshots that group duplicates; ships a token-efficient workflow guide (path not confirmed).
   - Needle Inspector MCP (Pro, paid): hierarchy reads, property edits and `get_edits` to pull changes back into source.
   - linegel "threejs-complete-set-of-skill" (27 skills for r185.1 WebGPU and TSL): notable for tracking which visual claims have evidence; no token guidance.

**Published guidance.** Anthropic's vision docs (token math, resize advice, Files API to avoid resending bytes). Playwright's coding agents page and CLI. IWSDK AI tooling docs. No general guide specific to "3D plus agents plus tokens" was found; threewright can fill that gap.

---

## Implications for threewright

**kb entries to write** (one file each, with a "last verified" date):
- `kb/scenarios/scroll-storytelling.md`: GSAP plus Lenis plus one canvas, R3F ScrollControls, view transitions, reduced motion rules, budgets, poster fallback.
- `kb/scenarios/product-configurator.md`: model-viewer versus three.js decision table, KHR_materials_variants, IBL and tone mapping, USDZ and AR Quick Look.
- `kb/scenarios/bim-and-cad.md`: That Open stack, Fragments conversion offline, origin rebasing.
- `kb/scenarios/geospatial.md`: 3DTilesRendererJS plugins, Google and Cesium ion keys and attribution, three-geospatial, globe.gl, MapLibre custom layers.
- `kb/scenarios/gaussian-splats.md`: native r186 renderer versus Spark 2.0, format table, KHR_gaussian_splatting, splat budgets, GaussianSplats3D deprecation.
- `kb/scenarios/scivis.md`: volume raymarching, Mol* and 3Dmol.js pointers, Potree and Potree-Next, COPC.
- `kb/scenarios/generative-art.md`: TSL, determinism checklist, fxhash API.
- `kb/scenarios/webxr.md`: device support matrix with dates, IWSDK versus @react-three/xr versus core, Quest performance checklist, Vision Pro input differences.
- `kb/scenarios/text-and-ui.md`: troika versus MSDF versus glyph versus uikit versus HTML overlay.
- `kb/scenarios/avatars.md`: RPM shutdown warning, VRM workflow, three-vrm WebGPU note.
- `kb/testing/three-js-own-tests.md`, `kb/testing/node-unit-tests.md`, `kb/testing/visual-regression.md`, `kb/testing/ci-webgl.md`.
- `kb/agents/token-budget.md`: the image token table, the text-first ladder, binary exclusions.

**Templates.**
- `templates/scroll-hero/` (vanilla three plus GSAP plus Lenis, reduced motion branch, poster fallback).
- `templates/product-viewer/` (model-viewer page and a three.js page with variants and a USDZ link).
- `templates/splat-viewer/` (r186 native loader, and a Spark variant).
- `templates/webxr-starter/` (core three with hands and foveation; note IWSDK as the alternative).
- `templates/test-harness/`: Playwright config with SwiftShader launch flags, a `__ready` signal helper, clock freeze, seeded random, canvas-only screenshot at 480x300, `maxDiffPixelRatio: 0.01`; a GitHub Actions workflow with xvfb and a Linux baseline job; a Vitest node config for math tests and a Vitest browser mode config for render tests.

**Scripts** (all print compact text, never images, unless asked):
- `scripts/scene-dump.js`: inject into a page (or run via Playwright) and print a collapsed scene graph with counts, capped at N lines.
- `scripts/render-stats.js`: report `renderer.info` for one frame (WebGL and WebGPU field names) and memory deltas across a reload.
- `scripts/console-errors.js`: open a URL headless, collect errors and warnings only, dedupe, print.
- `scripts/snap.js`: canvas-only screenshot at a fixed small size to a file, print path and token estimate `ceil(w/28)*ceil(h/28)`.
- `scripts/glb-report.sh`: wrap `gltf-transform inspect` and `validate` into a short summary (sizes, counts, extensions, errors).
- `scripts/lint-legacy-three.sh`: grep for outdated three.js patterns listed in llms.txt.
- An ignore list for agents: `*.glb *.gltf *.bin *.hdr *.exr *.ktx2 *.ply *.spz *.sog *.splat *.rad *.ifc *.frag`.

**Skill rules.** Verification ladder: static lint, then console errors, then render stats and scene dump, then glTF report, then one small screenshot, then visual diff in CI. State the token cost of each rung.

## Claims likely to change

- Three.js version (r186 now, monthly releases) and the native splat renderer API.
- KHR_gaussian_splatting compression companions (SPZ or SOG based) and which format wins delivery.
- Spark versions and .RAD adoption; WebGPU support in Spark.
- R3F v10 and drei release status; @react-three/test-renderer peer ranges.
- @pmndrs/glyph (pmndrs/text) leaving pre-release; troika WebGPU support.
- Safari: visionOS immersive-ar, any iOS WebXR, cross-document view transitions in Safari.
- Interop 2026 WebXR scope and scores.
- IWSDK MCP tool count (45 at 0.5.3) and threejs-devtools-mcp tool count (59).
- Claude image limits and token formula (changed between model generations already).
- Chrome SwiftShader flags and GitHub GPU runner pricing.
- model-viewer (4.3.1) and three.js version it bundles.
- Avatar platform closures.
- Google Map Tiles API terms and pricing.

## Search plan for next refresh

1. GitHub releases for mrdoob/three.js (latest rN notes: splats, XR, testing, llms.txt changes). Re-read `test/e2e/puppeteer.js` constants and `.github/workflows/ci.yml`.
2. sparkjsdev/spark releases; Radiance Fields monthly "Gaussian Splatting in <month>" issue; KhronosGroup/glTF extensions folder for splat compression extensions.
3. pmndrs: react-three-fiber v10, drei, xr, uikit, text (glyph), test-renderer npm versions.
4. developers.meta.com IWSDK AI tooling page (tool count, modes) and WebXR perf pages.
5. WebKit blog and Safari release notes for WebXR and view transitions; Interop 2026 dashboard for WebXR.
6. platform.claude.com vision page for token formula and limits.
7. Playwright release notes and `@playwright/cli`; Vitest browser mode docs.
8. Chromium SwiftShader doc for flag changes.
9. NASA-AMMOS/3DTilesRendererJS changelog; takram three-geospatial; MapLibre examples.
10. ThatOpen engine_components and fragments releases.
11. pixiv/three-vrm releases; Avatar SDK "who's alive" style roundups (vendor, cross-check).
12. google/model-viewer releases.
13. Search terms: "three.js MCP", "three.js agent skill", "WebGL visual regression CI 2027", "gaussian splat format 2027".

## Sources (URL plus date accessed or published)

1. Three.js r186 release notes, https://github.com/mrdoob/three.js/releases/tag/r186 (release Sept 2026; accessed 2026-09-26)
2. Three.js llms.txt, https://threejs.org/docs/llms.txt (accessed 2026-09-26)
3. Three.js llms-full.txt, https://github.com/mrdoob/three.js/blob/dev/docs/llms-full.txt (accessed 2026-09-26)
4. Three.js issue 31933, llms.txt proposal, https://github.com/mrdoob/three.js/issues/31933 (accessed 2026-09-26)
5. Three.js e2e test script, https://raw.githubusercontent.com/mrdoob/three.js/dev/test/e2e/puppeteer.js (accessed 2026-09-26)
6. Three.js package.json scripts, https://raw.githubusercontent.com/mrdoob/three.js/dev/package.json (accessed 2026-09-26)
7. Three.js CI workflow, https://raw.githubusercontent.com/mrdoob/three.js/dev/.github/workflows/ci.yml (accessed 2026-09-26)
8. Three.js test folder, https://github.com/mrdoob/three.js/tree/dev/test (accessed 2026-09-26)
9. Three.js Info docs, https://threejs.org/docs/pages/Info.html (accessed 2026-09-26)
10. Utsubo, "100 Three.js Tips That Actually Improve Performance (2026)", https://www.utsubo.com/blog/threejs-best-practices-100-tips (published 2026-09-11)
11. Utsubo, "What's New in Three.js (2026)", https://www.utsubo.com/blog/threejs-2026-what-changed (accessed 2026-09-26)
12. World Labs, "Streaming 3DGS worlds on the web" (Spark 2.0), https://www.worldlabs.ai/blog/spark-2.0 (published 2026-04-14)
13. Spark repo, https://github.com/sparkjsdev/spark (accessed 2026-09-26)
14. Radiance Fields, "Gaussian Splatting in August 2026", https://radiancefields.substack.com/p/gaussian-splatting-in-august-2026 (published Aug/Sept 2026)
15. GaussianSplats3D README, https://github.com/mkkellogg/GaussianSplats3D (accessed 2026-09-26)
16. KHR_gaussian_splatting spec, https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_gaussian_splatting/README.md (accessed 2026-09-26)
17. Khronos press release, glTF Gaussian splatting, https://www.khronos.org/news/press/gltf-gaussian-splatting-press-release (Feb 2026)
18. CG Channel, splats in glTF, https://www.cgchannel.com/2026/02/3d-gaussian-splats-are-being-added-to-the-gltf-standard/ (Feb 2026)
19. PlayCanvas splat formats, https://developer.playcanvas.com/user-manual/gaussian-splatting/formats/ (accessed 2026-09-26)
20. PlayCanvas blog, SOG open sourced, https://blog.playcanvas.com/playcanvas-open-sources-sog-format-for-gaussian-splatting/ (accessed 2026-09-26)
21. playcanvas/splat-transform, https://github.com/playcanvas/splat-transform (accessed 2026-09-26)
22. Swyvl, "Gaussian Splat Formats: PLY vs SPZ vs SOG vs KSplat", https://swyvl.io/blog/gaussian-splat-formats-ply-spz-ksplat/ (accessed 2026-09-26)
23. 3DTilesRendererJS, https://github.com/NASA-AMMOS/3DTilesRendererJS (accessed 2026-09-26)
24. 3DTilesRendererJS R3F README, https://github.com/NASA-AMMOS/3DTilesRendererJS/blob/master/src/r3f/README.md (accessed 2026-09-26)
25. Three.js 3D tiles plus clouds example, https://threejs.org/examples/webgl_loader_3dtiles.html (accessed 2026-09-26)
26. takram three-geospatial clouds, https://github.com/takram-design-engineering/three-geospatial/tree/main/packages/clouds (accessed 2026-09-26)
27. globe.gl, https://github.com/vasturiano/globe.gl (accessed 2026-09-26)
28. MapLibre, add a 3D model using three.js, https://maplibre.org/maplibre-gl-js/docs/examples/add-a-3d-model-using-threejs/ (accessed 2026-09-26)
29. MapLibre, add 3D tiles using three.js, https://maplibre.org/maplibre-gl-js/docs/examples/add-3d-tiles-using-threejs/ (accessed 2026-09-26)
30. That Open web-ifc, https://github.com/thatopen/engine_web-ifc (accessed 2026-09-26)
31. That Open Fragments docs, https://docs.thatopen.com/Tutorials/Fragments/ (accessed 2026-09-26)
32. @thatopen/fragments npm, https://www.npmjs.com/package/@thatopen/fragments (accessed 2026-09-26)
33. model-viewer releases, https://github.com/google/model-viewer/releases (4.3.1 current; accessed 2026-09-26)
34. model-viewer v4.0.0 release, https://github.com/google/model-viewer/releases/tag/v4.0.0 (accessed 2026-09-26)
35. Three.js glTF variants example, https://threejs.org/examples/webgl_loader_gltf_variants.html (accessed 2026-09-26)
36. KHR_materials_variants spec, https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_variants/README.md (accessed 2026-09-26)
37. glTF Transform KHRMaterialsVariants, https://gltf-transform.dev/modules/extensions/classes/KHRMaterialsVariants (accessed 2026-09-26)
38. Lenis, https://github.com/darkroomengineering/lenis (accessed 2026-09-26)
39. Codrops, scroll-revealed WebGL gallery, https://tympanus.net/codrops/2026/02/02/building-a-scroll-revealed-webgl-gallery-with-gsap-three-js-astro-and-barba-js/ (2026-02-02)
40. drei ScrollControls, http://drei.docs.pmnd.rs/controls/scroll-controls (accessed 2026-09-26)
41. MDN View Transition API, https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API (accessed 2026-09-26)
42. Brainstorms and Raves, "The View Transitions API in 2026", https://brainstormsandraves.com/css/view-transitions-2026/ (2026)
43. Potree-Next, https://github.com/m-schuetz/Potree-Next (accessed 2026-09-26)
44. Potree, https://github.com/potree/potree (accessed 2026-09-26)
45. Mol* paper, https://academic.oup.com/nar/article/49/W1/W431/6270780 (2021)
46. 3Dmol.js, https://github.com/3dmol/3Dmol.js (accessed 2026-09-26)
47. Three.js webgpu volume cloud example, https://threejs.org/examples/webgpu_volume_cloud.html (accessed 2026-09-26)
48. Maxime Heckel, Field Guide to TSL and WebGPU, https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/ (accessed 2026-09-26)
49. fxhash docs, open-form genart, https://docs.fxhash.xyz/fxh/programming-open-form-genart (accessed 2026-09-26)
50. Meta IWSDK overview, https://developers.meta.com/horizon/documentation/iwsdk/guides/overview/ (accessed 2026-09-26)
51. Meta IWSDK AI-assisted dev tooling, https://beta.developers.meta.com/horizon/documentation/web/iwsdk-ai-assisted-dev-tooling/ (updated 2026-09-04)
52. facebook/immersive-web-sdk, https://github.com/facebook/immersive-web-sdk (accessed 2026-09-26)
53. Meta WebXR performance best practices, https://developers.meta.com/horizon/documentation/web/webxr-perf-bp/ (accessed 2026-09-26)
54. Meta WebXR performance optimization, https://developers.meta.com/horizon/documentation/web/webxr-perf/ (accessed 2026-09-26)
55. VR.org, WebXR and Interop 2026, https://vr.org/articles/webxr-interop-2026-cross-browser-standard (2026-06-17)
56. Brown VR wiki, WebXR on visionOS, https://www.vrwiki.cs.brown.edu/hardware/vr-hardware/apple-vision-pro/development-approaches-for-visionos/webxr-on-visionos (accessed 2026-09-26)
57. XRDoctors, WebXR on iOS in 2026, https://xrdoctors.pro/blog/webxr-on-ios-what-actually-works (2026)
58. pmndrs, Reintroducing @react-three/xr, https://pmnd.rs/blog/reintroducing-react-three-xr/ (accessed 2026-09-26)
59. pmndrs/uikit vanilla docs, https://pmndrs.github.io/uikit/docs/getting-started/vanilla (accessed 2026-09-26)
60. pmndrs/text (glyph), https://github.com/pmndrs/text (accessed 2026-09-26)
61. Codrops, WebGPU Gommage MSDF effect, https://tympanus.net/codrops/2026/01/28/webgpu-gommage-effect-dissolving-msdf-text-into-dust-and-petals-with-three-js-tsl/ (2026-01-28)
62. Troika and WebGPU forum thread, https://discourse.threejs.org/t/troika-three-text-and-webgpu/55737 (accessed 2026-09-26)
63. pixiv/three-vrm, https://github.com/pixiv/three-vrm (accessed 2026-09-26)
64. Variety, Netflix acquires Ready Player Me, https://variety.com/2025/digital/news/netflix-acquires-ready-player-me-games-avatar-creation-1236612915/ (Dec 2025)
65. TechCrunch, Netflix acquires Ready Player Me, https://techcrunch.com/2025/12/19/netflix-acquires-gaming-avatar-maker-ready-player-me/ (2025-12-19)
66. Avatar SDK, "Avatar Platforms in 2026: Who's Alive, Who's Gone", https://avatarsdk.com/blog/2026/08/31/avatar-platforms-2026-whos-alive-whos-gone/ (2026-08-31, vendor source)
67. Anthropic vision docs, https://platform.claude.com/docs/en/build-with-claude/vision (accessed 2026-09-26)
68. Anthropic vision coordinates docs, https://platform.claude.com/docs/en/build-with-claude/vision-coordinates (accessed 2026-09-26)
69. Chromium SwiftShader doc, https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/gpu/swiftshader.md (accessed 2026-09-26)
70. Chrome Status, remove SwiftShader fallback, https://chromestatus.com/feature/5166674414927872 (accessed 2026-09-26)
71. Dave Snider, "Running Playwright with GPU powered Actions", https://davesnider.com/gputests (2026-02-23)
72. Playwright issue 36228, toHaveScreenshot in GitHub workflow, https://github.com/microsoft/playwright/issues/36228 (accessed 2026-09-26)
73. testdino playwright-skill, canvas and WebGL, https://github.com/testdino-hq/playwright-skill/blob/main/core/canvas-and-webgl.md (accessed 2026-09-26)
74. Vitest browser mode guide, https://vitest.dev/guide/browser/ (accessed 2026-09-26)
75. @react-three/test-renderer npm, https://www.npmjs.com/package/@react-three/test-renderer (accessed 2026-09-26)
76. R3F PR 3935, React 19.3 support, https://github.com/pmndrs/react-three-fiber/pull/3935 (2026)
77. headless-gl, https://github.com/stackgl/headless-gl (accessed 2026-09-26)
78. glTF Transform CLI, https://gltf-transform.dev/cli (4.5.0; accessed 2026-09-26)
79. Khronos glTF-Validator, https://github.com/KhronosGroup/glTF-Validator (accessed 2026-09-26)
80. glTF Transform issue 231, validate format, https://github.com/donmccurdy/glTF-Transform/issues/231 (accessed 2026-09-26)
81. threejs-devtools-mcp, https://github.com/DmitriyGolub/threejs-devtools-mcp (accessed 2026-09-26)
82. Needle Inspector for three.js, https://engine.needle.tools/docs/three/needle-devtools-for-threejs-chrome-extension.html (updated 2026-09-23)
83. Microsoft playwright-cli, https://github.com/microsoft/playwright-cli (accessed 2026-09-26)
84. TestCollab, Playwright CLI token comparison, https://testcollab.com/blog/playwright-cli (2026)
85. Playwright coding agents docs, https://playwright.dev/docs/getting-started-cli (accessed 2026-09-26)
86. threejs-skills.com (linegel skill pack), https://threejs-skills.com/ (accessed 2026-09-26)
87. Three.js forum, "Three.js and AI Agents: A New Workflow", https://discourse.threejs.org/t/three-js-and-ai-agents-a-new-workflow/88250 (2025-11-21)
