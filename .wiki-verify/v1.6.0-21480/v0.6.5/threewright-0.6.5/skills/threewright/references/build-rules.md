# Build rules for three.js r186

Read before writing three.js code. Each rule names the knowledge-base entry with the detail (`tw kb show <slug>`); `tw lint` enforces the ones a pattern can see. These are current for three 0.186.1 (2026-09-24); an older project keeps its own release's APIs unless the user asked to upgrade.

## Loading

- ES modules only. No-build pages use an import map pinned to one exact version on jsDelivr (`three@0.186.1`) and are served over http; bundler projects install `three@0.186.1` and `@types/three@0.186.0`. Never `build/three.min.js` (gone since r161), never `examples/js` (gone since r148), never `*.min.js` builds (gone in r186), never an unpinned CDN URL. `import-maps-and-builds`.
- Addons come from `three/addons/...` with the `.js` extension (`three/addons/controls/OrbitControls.js`); they are never on the `THREE` namespace.
- WebGPU pages map `three`, `three/webgpu` and `three/tsl`, with `three` and `three/webgpu` pointing at the same `three.webgpu.js`. Use templates `html-importmap` and `html-webgpu` as the pattern.

## Renderer

- Pick per scenario (`renderer-choice`): WebGLRenderer for docs, product viewers, scroll heroes, video, XR, CAD, maps; WebGPURenderer for games, generative art, compute. WebGPURenderer falls back to WebGL 2 by itself; check `renderer.backend.isWebGPUBackend` when it matters (`webgpu-backend-check`).
- WebGPURenderer: `await renderer.init()` before PMREM, compute or the first render (or start with `setAnimationLoop`). The `*Async` render methods are deprecated since r181; `compileAsync` and `computeAsync` remain.
- GLSL `ShaderMaterial`, `onBeforeCompile` and `EffectComposer` are the WebGL path only; on WebGPURenderer write TSL node materials and use `RenderPipeline` with `pass()` (`tsl`, `post-processing`).
- `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`, `setSize` from the container, and a resize handler that updates `camera.aspect` and calls `camera.updateProjectionMatrix()` (`resize-and-pixel-ratio`).

## Loop and time

- `renderer.setAnimationLoop(fn)` (not a hand-made rAF loop); time from `THREE.Timer` (`timer.update(t)` once per frame, then `getDelta()` or `getElapsed()`; `timer.connect(document)` stops a hidden tab from producing one huge delta). `THREE.Clock` is deprecated since r183. Drive motion from elapsed time or delta, never a per-frame constant, so any frame rate and `tw video` look the same (`animation-and-time`, `fixed-timestep-loop`).
- Pages that sit still: render on demand (controls `change` event) instead of 60 fps forever (`render-on-demand`).

## Colour and light

- `renderer.outputColorSpace` stays `SRGBColorSpace` (the default). Colour textures (`map`, `emissiveMap`) loaded by hand need `texture.colorSpace = THREE.SRGBColorSpace`; data textures (normal, roughness, metalness, AO) stay untagged. GLTFLoader tags them itself (`color-management`).
- Pick a tone mapping on purpose: `ACESFilmicToneMapping` for a filmic look, `AgXToneMapping` or `NeutralToneMapping` for product colour.
- Physically based lights only (legacy light units were removed in r165). Lit materials need a light or `scene.environment`; `RoomEnvironment` through `PMREMGenerator` lights PBR with no download; HDR files load with `HDRLoader` (`RGBELoader` is deprecated since r180). `environment-lighting`.
- Shadows: `renderer.shadowMap.enabled = true`, `light.castShadow`, `mesh.castShadow` and `receiveShadow`, `PCFShadowMap` (soft since r182; `PCFSoftShadowMap` is deprecated), a tight shadow camera (`lighting-and-shadows`).

## Models and assets

- glTF or GLB only on the web. `GLTFLoader` plus the decoders the file needs (`tw glb <file>` names them: DRACOLoader, KTX2Loader, MeshoptDecoder) (`load-gltf-with-decoders`). Optimize with glTF Transform or gltfpack (`optimize-gltf`). Frame the camera from the bounding box (`fit-camera-to-object`).
- No runtime downloads from hosts you do not control in pages meant to last; CC0 sources and credits are in `threewright-assets`.

## Lifetime and performance

- Dispose what you remove: geometries, materials, textures, render targets, and the renderer on teardown (`dispose-a-scene`, `memory-and-disposal`).
- Budgets for phones: about 100 draw calls, under 100k triangles in view, textures 2048 px max (KTX2 for many), DPR at most 2. Repeated objects use `InstancedMesh` or `BatchedMesh` (`performance`, `instanced-scatter`).

## People

- Honour `prefers-reduced-motion` (no auto-rotation, no scroll-scrubbed camera flights). Give auto-motion a pause control. Keyboard orbit and a focus ring for interactive canvases. `role="img"`, an `aria-label`, and a text or table alternative for anything that carries information (`accessibility`, `keyboard-orbit-and-reduced-motion`).

## Verify

- `tw lint`, then `tw check` (`result: OK`), then pixels only for visual questions (`verification-ladder`). Expose `window.__tw.ready` (a promise) when the page loads assets asynchronously, so the check waits for them.
