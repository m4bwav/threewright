---
title: WebGPU backend check
slug: webgpu-backend-check
kind: recipe
summary: Detect at runtime whether WebGPURenderer actually got the WebGPU backend or fell back to WebGL 2, and force each path deliberately for testing.
tags: [webgpu, fallback, backend, forceWebGL, isWebGPUBackend]
applies_to: ">=r156"
status: current
renderer: webgpu
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-direction.md, ai-docs/HANDOFF.md]
related: [webgpu-support, renderer-choice, headless-and-ci]
template: html-webgpu
---

# WebGPU backend check

## Goal

`WebGPURenderer` falls back to a WebGL 2 backend silently whenever WebGPU is unavailable (no adapter, an insecure context, an old browser). A page that "looks fine" tells you nothing about which backend actually ran it. Log the real backend, and be able to force either one for testing.

## Code

```js
import * as THREE from 'three/webgpu';

const renderer = new THREE.WebGPURenderer({
  antialias: true,
  // Force the WebGL 2 backend on purpose, e.g. from a query string, so a test
  // suite can exercise the fallback path deliberately instead of hoping for it:
  forceWebGL: new URLSearchParams(location.search).has('webgl'),
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

await renderer.init(); // required before reading backend state reliably

const backend = renderer.backend;
console.log(
  'WebGPURenderer backend:',
  backend.isWebGPUBackend ? 'WebGPU' : 'WebGL 2 fallback',
  backend.isWebGPUBackend && backend.compatibilityMode ? '(compatibility mode: MSAA off, limits apply)' : ''
);

// Expose it for a headless check (see Verify below).
window.__backend = () => ({
  isWebGPUBackend: !!backend.isWebGPUBackend,
  compatibilityMode: !!backend.compatibilityMode,
});
```

`backend.isWebGPUBackend` is `true` on the real WebGPU path and undefined/falsy on the WebGL 2 fallback. `backend.compatibilityMode` (WebGPU path only) is `true` when the adapter only reached WebGPU's restricted "compatibility" tier (Chrome 146+ on Android GLES 3.1, for example), which means MSAA is off and several texture/MRT limits apply; add an FXAA, SMAA or TRAA display node in that case (see `webgpu-support`).

## Verify

- `tw check <page>` prints the real backend on its renderer line: `WebGPURenderer (WebGPU)` or `WebGPURenderer (WebGL2 fallback)`.
- `tw check <page> --eval "renderer.backend.isWebGPUBackend"` prints `true` or `false`; `--eval` binds `renderer`, `scene` and `camera` to the ones tw observed, even when the page keeps them module scoped. `--eval "JSON.stringify(__backend())"` reads the window function this code exposes.
- To force the fallback from tw, use `--gl swiftshader` (headless SwiftShader has no WebGPU adapter). tw takes a file or folder, not a query string, so the `?webgl` switch is for a dev server or a URL.
- Checked 2026-09-26 (Windows 11, Chrome 153 headless, NVIDIA RTX 5060 Ti) with this code on a one-box page: default headless and `--webgpu` both gave `WebGPURenderer (WebGPU)` and `{"isWebGPUBackend":true,"compatibilityMode":false}`; `--gl swiftshader` gave `WebGPURenderer (WebGL2 fallback)` and `isWebGPUBackend:false`. All three `result: OK`.
- Older Chromium can fail on the WebGPU path instead of falling back: Chromium 141 (the Playwright build in the Linux container) throws a `GPUTextureViewDescriptor` swizzle error, because r186 always requests `swizzle: 'rgba'`. Treat a failure there as a browser problem, not a page bug.

## Notes

- 2026-09-26: written from the direction research (sections 1.3, 3.6) and checked directly against `node_modules/three/src/renderers/webgpu/WebGPUBackend.js` in the installed 0.186.1 (`isWebGPUBackend`, `compatibilityMode`, `forceWebGL` all confirmed in source); the WebGPU-backend failure mode in this specific container is recorded in `ai-docs/HANDOFF.md` and reproduced here on 2026-09-26.
- 2026-09-26: all three paths verified on Windows with an RTX 5060 Ti and Chrome 153; the old `--webgl` advice named a flag tw does not have and was replaced; `--eval "renderer..."` failed on module-scoped pages until tw began binding `renderer`, `scene` and `camera` for `--eval` the same day.
