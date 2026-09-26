# Ecosystem libraries and asset pipeline for three.js in 2026

Date: 2026-09-26
Track: threewright research, third-party libraries worth reaching for and the asset pipeline that feeds a three.js scene.
Related: 2026-09-26-3d-dataviz-and-docs.md, 2026-09-26-video-and-games.md.

## Summary

three.js itself is at r186 (npm `three` 0.186.1, published 2026-09-24). The framework layer has settled: React Three Fiber v9 is the stable line (9.8.1), v10 exists only as an alpha/canary tag, so a skill should target v9 API today and note v10 as upcoming. Threlte (Svelte) and TresJS (Vue) are both healthy and on current majors. For effects, three.js's own TSL-based RenderPipeline (renamed from PostProcessing in r183) is now the first choice on WebGPU; the pmndrs `postprocessing` package remains the right choice for WebGL-only or React Three Fiber projects that have not moved to TSL. Physics has three living options (Rapier, cannon-es, Jolt) with Rapier the default recommendation for new work. Gaussian splatting has a real, actively developed answer for three.js: Spark (`@sparkjsdev/spark`). Asset compression is a solved, standard pipeline: glTF-Transform CLI driving Draco/meshopt for geometry and KTX2/Basis for textures. Poly Haven, Kenney and Quaternius are all CC0, no attribution needed, which makes them the default asset sources for an agent.

## 1. Rendering and scene frameworks

- **React Three Fiber (R3F)**: npm dist-tags show `latest: 9.8.1`, `alpha: 10.0.0-alpha.5`, `canary: 10.0.0-canary...`, `rc: 9.0.0-rc.10`. Use v9 as the supported target; mention v10 exists but is pre-release (unverified what v10's headline changes are beyond React 19 alignment; check the R3F changelog at next refresh).
- **drei**: 10.7.9, tracks R3F v9. Use for camera rigs, loaders, `<Bvh>`, `<Instances>`, `<Html>` helpers instead of hand-rolling them.
- **Threlte** (Svelte + three.js): meta-package `threlte` on npm is stale (last published 2022), but the real code lives in scoped packages: `@threlte/core` 8.6.1, published 2026-09-14, actively maintained. A skill should tell agents to install `@threlte/core` (and `@threlte/extras`, `@threlte/rapier` as needed), not the bare `threlte` package.
- **TresJS** (Vue + three.js): `@tresjs/core` 5.9.0, published 2026-09-14. Healthy, current. The bare `tresjs` name on npm is unrelated/unpublished for this purpose (confirm before scripting an install).
- **Vanilla three.js** stays the right choice for a small tool, a video-frame renderer, or anything an agent must fully control frame-by-frame (see the video doc). Reach for R3F/Threlte/TresJS only when the host app is already React/Svelte/Vue.

## 2. Post-processing: three's own pipeline vs pmndrs postprocessing

- three.js r183 renamed `PostProcessing` to `RenderPipeline` (same class, same API) and moved built-in effects into `three/addons/tsl/display/` as TSL node functions: `FXAANode`, `SMAANode`, `TRAANode`, `GTAONode`, `SSRNode`, `DepthOfFieldNode`, `OutlineNode`, bloom, dot-screen, and more. TSL is the same node system three.js uses for materials and compute, so passes can share scene data instead of chaining opaque GLSL passes.
- Rule of thumb: on `WebGPURenderer` (or a WebGL2 backend that has migrated to TSL materials), use three's own `RenderPipeline` and TSL nodes for post effects. On a plain `WebGLRenderer` project, or inside React Three Fiber where most examples still assume `EffectComposer`, `pmndrs/postprocessing` (npm `postprocessing`, 6.39.5, published 2026-09-09) is still the practical default; it is actively maintained and is what `@react-three/postprocessing` wraps.
- Do not mix the two effect systems in one pass chain; pick one per renderer.

## 3. Utility and interaction libraries

- **three-mesh-bvh** (0.9.15, published 2026-09-09): fast raycasting and spatial queries over large or skinned meshes. Use for picking, collision queries against static geometry, or frustum/shape casts at a scale where three's default raycaster is too slow.
- **camera-controls** (3.1.2, published 2025-11-17): a fuller-featured alternative to `OrbitControls`/`MapControls` with damping, collision, and truck/dolly/tilt actions out of the box. Reach for it when a project needs cinematic camera moves beyond orbit-and-zoom.
- **troika-three-text** (0.52.5, published 2026-07-24): SDF-based text rendering for crisp, GPU-cheap labels and HUD text in a three.js scene; still the standard answer, actively maintained.
- **3d-tiles-renderer** (0.5.3, published 2026-09-18): streams Cesium 3D Tiles (photogrammetry, city-scale, terrain) into three.js with tile culling and LOD. Use for GIS/large-scale/real-world capture scenes, not for ordinary game assets.
- **gltfjsx**: 6.5.3, but last published 2024-11-04 (unverified whether abandoned or simply stable/feature-complete; check its GitHub issues at next refresh). It still works for turning a GLB into a typed React/R3F component; treat lack of recent releases as a caution, not a blocker.

## 4. Physics engines

- **Rapier** (`@dimforge/rapier3d-compat` 0.21.0, published 2026-09-25; `@react-three/rapier` 2.2.0 for R3F): Rust-via-WASM, deterministic, fast, and the most actively developed of the three options. Default recommendation for new three.js games and simulations. Ships a `KinematicCharacterController` (`move_shape` method, configurable `filterFlags`/`filterGroups`/`filterPredicate`) that is the standard building block for player movement — see the video-and-games doc for the pattern.
- **cannon-es** (0.20.0): a maintained fork of cannon.js, pure JS, simpler API, lower performance ceiling than Rapier. Reasonable for small physics needs or when WASM is unwanted, but no longer the first choice.
- **Jolt** (`jolt-physics` 1.1.0, published 2026-07-11): WASM port of the Jolt physics engine (used in Horizon Forbidden West). Higher performance ceiling than Rapier for large rigid-body counts, but a smaller JS ecosystem and fewer three.js-specific examples (unverified how mature `@react-three` bindings are; check before recommending it as a default).
- Overall: Rapier for defaults and character controllers, Jolt when raw large-scale rigid-body performance matters and the team can work closer to the wire, cannon-es only for legacy or minimal-dependency cases.

## 5. Gaussian splatting: Spark

- **Spark** (`@sparkjsdev/spark`, 2.2.0) is the actively developed, "advanced" 3D Gaussian Splatting renderer built specifically for three.js, from World Labs. It composes splats and mesh objects in the same scene graph, supports `.ply`, `.sogs`, `.spz`, `.splat`, `.ksplat` formats, and claims working WebGL2 coverage across ~98% of WebGL2-capable devices.
- It replaces the older `mkkellogg/GaussianSplats3D` as the recommended path for anyone wanting splats inside a normal three.js scene rather than a splat-only viewer. Its "Dynos" system (composable GLSL-generating function graphs) is worth mentioning to agents that want procedural or animated splats.
- three.js r186 itself also merged native Gaussian-splat rendering support for `WebGPURenderer` (see the r186 release notes referenced in the dataviz doc). For WebGPU-first projects, check whether the built-in renderer now covers the need before reaching for Spark; for WebGL2 projects, Spark remains the practical choice (unverified which native-vs-Spark tradeoff wins for a given feature set as of r186; recheck at next refresh).

## 6. Animation and UI tooling

- **gsap** (3.15.0) with ScrollTrigger: still the standard for timeline-based DOM/3D-property animation and scroll-linked effects; works fine driving three.js object properties directly.
- **Theatre.js** (`@theatre/core` 0.7.2): last published 2024-05-19, over two years stale as of this research date. Treat it as a maintenance-mode or possibly stalled project (unverified — check github.com/theatre-js/theatre issues/commits at next refresh before recommending it for new work). It is still usable for keyframe-based animation sequencing but a skill should flag the staleness.
- **lil-gui** (0.21.0): the lightweight successor to dat.GUI, good default for quick debug panels.
- **leva** (0.10.1, published 2025-10-31): React-native controls panel, the standard pairing with React Three Fiber for tweakable values.
- **Tweakpane** (4.0.5): richer widget set (graphs, color pickers, presets) than lil-gui, framework-agnostic; reach for it when lil-gui's controls are too plain.

## 7. Asset pipeline: compression and optimization

- **glTF-Transform CLI** (`@gltf-transform/cli` 4.5.0) is the standard tool. Key subcommands:
  - `gltf-transform optimize input.glb output.glb` runs a sensible default pipeline (mesh compression, texture resizing/compression) in one step.
  - `gltf-transform draco input.glb output.glb --method edgebreaker` for Draco geometry compression.
  - `gltf-transform meshopt input.glb output.glb --level medium` for meshopt geometry compression (smaller runtime decode cost than Draco, decodes via `MeshoptDecoder`).
  - `gltf-transform optimize input.glb output.glb --texture-compress ktx2` (or separately `uastc`/`etc1s` subcommands) for KTX2/Basis Universal texture compression.
  - Combine flags in one `optimize` call for a full pass, e.g. `--texture-resize 1024 --compress draco --texture-compress webp`.
- **Loading compressed assets in three.js**: pair `DRACOLoader` or `MeshoptDecoder` with `GLTFLoader.setDRACOLoader()`/`setMeshoptDecoder()`, and `KTX2Loader` (which wraps the Basis Universal transcoder, loaded from `three/examples/jsm/libs/basis/`) via `GLTFLoader.setKTX2Loader()`. Always call `renderer` detection (`KTX2Loader.detectSupport(renderer)`) so the loader picks the right GPU texture format per device.
- **WebP** textures are supported directly by modern browsers and by glTF-Transform's `--texture-compress webp`; use for diffuse/color textures where KTX2's GPU-native format is not required (e.g. UI textures, non-3D-mapped images).

## 8. Asset sources and licensing

- **Poly Haven**: HDRIs, textures, and models, all CC0 (public domain equivalent). No attribution required even in commercial work. Best source for HDRI environment lighting.
- **Kenney**: game-ready model/sprite/asset packs, CC0, explicitly "free even in commercial projects," no attribution.
- **Quaternius**: stylized/low-poly character and prop packs, CC0, no attribution required for commercial, educational, or personal use.
- **Sketchfab**: mixed licensing per model; CC-licensed downloads exist but many models are "Standard" (viewer-only, no download rights) or CC-BY (attribution required) or non-commercial. Always check the specific model's license tab before using a Sketchfab asset in a shipped product; do not assume CC0.
- Recommendation for an agent building a scene: default to Poly Haven / Kenney / Quaternius for anything genuinely license-free, and only reach for Sketchfab when a specific real-world object or character is needed, checking that model's license explicitly.

## 9. Size budgets for the web

(General web-delivery guidance; not vendor-specified numbers, treat as house rules rather than verified specs.)

- Aim for a single hero GLB scene under roughly 5-15 MB after Draco/meshopt + KTX2 compression for a page that must load quickly on average connections; under 2-3 MB for anything embedded inline or auto-loaded above the fold.
- Texture budget: prefer KTX2/Basis over raw PNG/JPG in the shipped asset; keep individual texture resolution at 1024-2048px unless a hero close-up genuinely needs 4K, and always mip-map.
- Geometry budget: Draco or meshopt compression typically cuts geometry payload 5-10x; still watch triangle count for runtime GPU cost, not just download size (see the games doc for draw-call/triangle budgets).
- These are working defaults, not measured against a specific 2026 benchmark; mark as unverified and revisit if a harder number is needed for a specific target device class.

## Rules for the skill

1. Default new three.js UI work to vanilla three.js for tooling/rendering tasks, R3F v9 (not v10, which is still alpha) when the host is React, `@threlte/core` for Svelte, `@tresjs/core` for Vue.
2. Use three's own `RenderPipeline`/TSL nodes for post-processing on WebGPU; use pmndrs `postprocessing` for WebGL2/React Three Fiber projects. Never mix the two effect systems in one render pass chain.
3. Default physics engine is Rapier (`@dimforge/rapier3d-compat`, or `@react-three/rapier` in R3F). Suggest Jolt only when the project already needs very large rigid-body counts and can accept a smaller ecosystem. Use cannon-es only for legacy/minimal-dependency constraints.
4. For splats, recommend Spark (`@sparkjsdev/spark`) for WebGL2 three.js scenes; check whether the project's WebGPU renderer already covers native splat rendering before adding a dependency.
5. Always run new/downloaded glTF/GLB assets through `gltf-transform optimize` (Draco or meshopt geometry, KTX2 or WebP textures) before shipping; never ship an uncompressed GLB in production.
6. Default asset sourcing to Poly Haven, Kenney, and Quaternius (all CC0). Treat Sketchfab as license-per-model and require an explicit license check before use.
7. Flag Theatre.js and the bare `gltfjsx`/`threlte` packages as stale in any recommendation; point at the scoped/active packages (`@threlte/core`) instead of the stale umbrella package.
8. Keep a hero scene's compressed payload roughly in the 2-15 MB range depending on load context, and prefer 1024-2048px KTX2 textures unless the shot demands more.

## Claims likely to change

- R3F v10's stable release date and its actual feature delta from v9 (currently alpha/canary only).
- Whether Theatre.js resumes active development or is formally archived.
- Whether three.js's native WebGPU splat rendering (introduced r186) supersedes Spark for a growing share of use cases.
- Jolt's JS/three.js ecosystem maturity (character controllers, R3F bindings) — currently thin, could grow fast.
- gltfjsx's maintenance status (no release since 2024-11) — could resume, could be superseded.
- Exact size-budget numbers in section 9, which are house heuristics, not vendor-published specs.

## Search plan for next refresh

1. `npm view @react-three/fiber dist-tags` and the R3F changelog/blog for a v10 stable release.
2. GitHub `theatre-js/theatre` commits/issues for signs of life or an archive notice.
3. three.js release notes r187+ for WebGPU splat rendering maturity vs Spark's own changelog.
4. `npm view jolt-physics` plus a search for "jolt-physics three.js character controller" to see if bindings matured.
5. `npm view gltfjsx time.modified` and its GitHub repo for a new release or an archived/deprecated notice.
6. Re-check Poly Haven/Kenney/Quaternius license pages directly (not just aggregator posts) if any commercial-use question gets specific.

## Sources

1. npm registry, `npm view <pkg> version time.modified` for: three, @react-three/fiber, @react-three/drei, @react-three/rapier, three-mesh-bvh, camera-controls, troika-three-text, 3d-tiles-renderer, postprocessing, @dimforge/rapier3d-compat, cannon-es, jolt-physics, gsap, @theatre/core, lil-gui, leva, tweakpane, @gltf-transform/cli, gltfjsx, threlte, @threlte/core, @tresjs/core, @sparkjsdev/spark (2026-09-26)
2. Utsubo, "Migrate Three.js to WebGPU (2026)" and "100 Three.js Tips": https://www.utsubo.com/blog/webgpu-threejs-migration-guide , https://www.utsubo.com/blog/threejs-best-practices-100-tips (2026-09-26)
3. three.js docs, PostProcessing/TSL: https://threejs.org/docs/pages/PostProcessing.html , https://threejs.org/docs/pages/TSL.html (2026-09-26)
4. Three.js Roadmap, "The Complete Guide to Three.js Post-Processing in 2026": https://threejsroadmap.com/blog/the-complete-guide-to-threejs-post-processing-in-2026 (2026-09-26)
5. Poly Haven license page: https://polyhaven.com/license ; FAQ: https://docs.polyhaven.com/en/faq (2026-09-26)
6. 3DxDEV, "Kenney vs Quaternius: Best Free CC0 Game Assets": https://3dxdev.com/kenney-vs-quaternius-the-best-free-cc0-game-assets/ (2026-09-26, third party aggregator)
7. glTF-Transform CLI docs: https://gltf-transform.dev/cli ; npm package: https://www.npmjs.com/package/@gltf-transform/cli ; three.js forum compression thread: https://discourse.threejs.org/t/compression-draco-ktx2-example/31382 (2026-09-26)
8. Spark: https://sparkjs.dev/ , https://sparkjs.dev/docs/overview/ , https://github.com/sparkjsdev/spark , HN launch thread: https://news.ycombinator.com/item?id=44249565 (2026-09-26)
9. GaussianSplats3D (predecessor project, for contrast): https://github.com/mkkellogg/GaussianSplats3D (2026-09-26)
10. Rapier docs, character controller: https://rapier.rs/docs/user_guides/javascript/character_controller/ ; KinematicCharacterController API: https://rapier.rs/javascript3d/classes/KinematicCharacterController.html (2026-09-26)
11. Discourse, InstancedMesh vs BatchedMesh: https://discourse.threejs.org/t/how-to-choose-between-instancedmesh-and-batchedmesh/81221 (2026-09-26)
12. GitHub theatre-js organization and issues: https://github.com/theatre-js , https://github.com/theatre-js/theatre/issues (2026-09-26)
