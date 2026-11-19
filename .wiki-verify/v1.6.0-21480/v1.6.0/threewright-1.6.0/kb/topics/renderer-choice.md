---
title: Choosing WebGLRenderer or WebGPURenderer
slug: renderer-choice
kind: topic
summary: Which renderer to default to per scenario in r186, why, and what breaks if you pick the wrong one.
tags: [renderer, webgl, webgpu, decision, scenario, default, fallback]
applies_to: ">=r167"
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-direction.md, ai-docs/research/2026-09-26-core-r160-r186.md, https://raw.githubusercontent.com/mrdoob/three.js/r186/manual/pages/webgpurenderer.html, https://raw.githubusercontent.com/mrdoob/three.js/r186/docs/llms.txt]
related: [webgpu-support, tsl, webgpu-backend-check, bundle-size]
template: html-importmap
---

# Choosing WebGLRenderer or WebGPURenderer

## Essentials

- Both renderers ship in r186. `WebGPURenderer` (from `three/webgpu`) uses the WebGPU backend when the browser has it and falls back to a WebGL 2 backend by itself (automatic since r156); `WebGLRenderer` (from `three`) is WebGL 2 only. "WebGPURenderer" below always means the renderer with its fallback.
- The r186 manual is explicit: WebGPURenderer "is still in an experimental state", WebGLRenderer "is still maintained and the recommended choice for pure WebGL 2 applications" with "no plans to add larger new features". `llms.txt` tells agents "Use WebGLRenderer (default, mature)" and to reach for WebGPURenderer for TSL, compute or advanced node materials.
- New rendering features land on WebGPURenderer only: `ClusteredLighting`, order-independent transparency (`OITPassNode`), `SSAONode`, `VXGINode`, `DirectRenderPipeline`, native Gaussian splats, and WebXR over WebGPU. `SunLight` (r186) is the one big feature that landed on both. If a scene needs one of the WebGPU-only features, that decides the renderer regardless of the table below.
- Decision table (from the direction research, section 5), current for r186:

| Scenario | Default | Flip when |
|---|---|---|
| 3D chart in docs, product viewer, scroll hero, video capture, CAD/BIM, geospatial, WebXR | WebGLRenderer | The work is GPU compute (particle simulation, huge binning) or needs a WebGPU-only display node. |
| Game (browser, not XR), generative art, TSL/compute-heavy work | WebGPURenderer | Thousands of unique unbatched meshes (CPU bound, see Pitfalls), a required WebGL-only library (troika-three-text, pmndrs postprocessing), or MSAA on low-end Android. |
| Gaussian splats | Spark (WebGL) for large or streamed scenes; the r186 native `GaussianSplat` (WebGPU only) for small to medium scenes | See `gaussian-splats`. |

- Why WebGLRenderer wins the "boring" scenarios: a minimal scene bundles to about 126-133 KB gzip versus 205-215 KB for WebGPURenderer (about 1.6x); MSAA works everywhere WebGLRenderer runs, while WebGPU's compatibility mode (Chrome 146+ on Android GLES 3.1) turns MSAA off; render hosts used for headless capture and CI often expose WebGL through software rendering but no WebGPU adapter at all.
- Why WebGPURenderer wins games and generative art: TSL is the forward shader path (see `tsl`) and compiles to both backends from one source, so choosing it now avoids a second port later; compute-driven work (particles, sorting, culling) is faster on a real WebGPU backend.

## Pitfalls

- Headless capture: `navigator.gpu` can be missing or `requestAdapter()` can return `null` on GPU-less CI, and WebGPU needs a secure context (`http://localhost`, not `about:blank` or `file://`). WebGPURenderer hides this by quietly falling back to WebGL 2, so always log the backend (`webgpu-backend-check`) rather than assume the renderer you asked for is the one that ran.
- CPU-bound scenes: WebGPURenderer loses to WebGLRenderer on scenes with many unique, unbatched draws and on first-use pipeline compile time (three.js issue 33821, 2026-06-16: about 131 ms first render on WebGL versus about 2,100 ms on WebGPU for one material per mesh). Instance or batch repeated meshes and call `renderer.compileAsync()` before the scene is visible either way.
- WebGL-only libraries next to a WebGPURenderer: pmndrs `postprocessing`, `@react-three/postprocessing`, `troika-three-text`, `three-custom-shader-material`, `three-gpu-pathtracer`, official Spark releases, and `3DTilesRendererJS`'s `ImageOverlayPlugin` all use `ShaderMaterial` or `onBeforeCompile`, which WebGPURenderer does not support (see `tsl`). Check a library's renderer support before adding it to a WebGPU page.
- WebXR: there is no WebXR/WebGPU binding on Meta Quest ("It is not implemented on Meta Quest", three.js issue 32858, 2026-01-26). It ships only where `XRGPUBinding` exists (Apple Vision Pro, experimental on Chrome for Windows and Android XR). Default WebXR pages to WebGLRenderer.
- Compatibility mode: on devices that only reach WebGPU compatibility mode, three.js sets `renderer._samples = 0` (MSAA off) and limits MRT blending, and 2D textures above 4096 fail. Add an FXAA, SMAA or TRAA display node when `renderer.backend.compatibilityMode` is true.

## Verify

- `tw check <page>` prints the renderer on its second line, e.g. `renderer: WebGPURenderer (WebGPU)` or `renderer: WebGPURenderer (WebGL2 fallback)`; confirm it matches the renderer you intended.
- `tw check <page> --eval "renderer.backend.isWebGPUBackend"` returns the actual backend in use (see `webgpu-backend-check`).
- `tw lint <dir>` flags a WebGPU page that imports a WebGL-only post-processing or text library, or that constructs `ShaderMaterial`/`onBeforeCompile` alongside `WebGPURenderer` (rules `shadermaterial-on-webgpu`, `effectcomposer-on-webgpu`).

## Notes

- 2026-09-26: written from the direction research's renderer decision table (section 5) and its bundle-size measurements, and from the r186 manual and `llms.txt` fetched at the r186 tag.
