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

- `tw check <page> --eval "renderer.backend.isWebGPUBackend"` reports the real backend for a specific run; combine with `--webgl` or `--gl swiftshader`/`--gl gpu` page flags to force one path and confirm the other deliberately.
- `tw check <page>` itself prints the renderer/backend on its second line as `WebGPURenderer (WebGPU backend)` or `WebGPURenderer (WebGL2 fallback)` without any `--eval` needed.
- In this development container, the installed Chromium (141, via Playwright) fails to initialize the WebGPU backend at all with a `GPUTextureViewDescriptor` swizzle error (r186's `WebGPUBackend` always requests `swizzle: 'rgba'`, which that Chromium build does not support); see `ai-docs/HANDOFF.md` Gotchas. Checked 2026-09-26: `tw check <page> --webgpu` here reproduces that exact error and `result: PROBLEMS FOUND`; running the same page without `--webgpu` succeeds on the automatic WebGL 2 fallback with `result: OK`. Treat a clean `--webgpu` run as evidence only on a newer Chrome; treat a fallback run here as evidence for the fallback path only, not the WebGPU path.

## Notes

- 2026-09-26: written from the direction research (sections 1.3, 3.6) and checked directly against `node_modules/three/src/renderers/webgpu/WebGPUBackend.js` in the installed 0.186.1 (`isWebGPUBackend`, `compatibilityMode`, `forceWebGL` all confirmed in source); the WebGPU-backend failure mode in this specific container is recorded in `ai-docs/HANDOFF.md` and reproduced here on 2026-09-26.
