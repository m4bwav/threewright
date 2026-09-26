---
title: WebGPU browser support and its WebGL 2 fallback
slug: webgpu-support
kind: topic
summary: Real WebGPU reach by browser and platform in September 2026, compatibility mode limits, and why WebGPURenderer needs a tested fallback rather than a promise.
tags: [webgpu, webgl2, fallback, browser support, compatibility mode, caniuse, safari, firefox]
applies_to: ">=r156"
status: current
renderer: webgpu
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-direction.md, ai-docs/research/2026-09-26-scenarios-xr-and-testing.md]
related: [renderer-choice, webgpu-backend-check, headless-and-ci]
---

# WebGPU browser support and its WebGL 2 fallback

## Essentials

- WebGPU reaches 85.72% of global browser usage fully and 3.05% partially (88.77% total) in the caniuse dataset updated 2026-09-24. It is not Baseline (`web-features: baseline: false`). WebGL 2, by contrast, reaches 96.44%.
- Per-browser support (caniuse, gpuweb Implementation Status wiki, checked 2026-09-26):

| Browser | Platform | On by default since |
|---|---|---|
| Chrome, Edge | Windows, macOS, ChromeOS | 113 (2023-05-02) |
| Chrome | Android 12+, most GPUs | 121 (2024-01-23); Imagination GPUs since 139 |
| Chrome | Linux | Intel Gen12+ since 144; NVIDIA on Wayland since 147; other GPUs need `--enable-unsafe-webgpu` |
| Firefox | Windows | 141 (2025-07-22) |
| Firefox | macOS (Apple Silicon) | 145 on macOS 26+, 147 on all macOS versions |
| Firefox | macOS Intel, Linux, Android | No (Nightly only) |
| Safari | macOS, iOS, iPadOS, visionOS | 26.0 (2025-09-15), only on the 26-generation OS (Tahoe, iOS 26, visionOS 26) |
| Samsung Internet | Android | 24 (2024-03-27) |

- About a quarter of all iOS Safari usage (iOS 18 and older) has no WebGPU at all, and Firefox has none on Intel Macs, Linux stable or Android. `WebGPURenderer`'s automatic fallback to a WebGL 2 backend (since r156) is what makes those visitors see anything.
- Compatibility mode: browsers that only reach a restricted "compatibility" WebGPU tier (for example Chrome 146+ on Android GLES 3.1) return a Core adapter if they have no compat support, or a Compatibility adapter with real limits otherwise: no multisampled `rgba16float`/`r32float` textures, 2D textures capped at 4096, 4 color attachments, 128 compute invocations per workgroup, no cube array views. Since r183 `WebGPUBackend` always requests `featureLevel: 'compatibility'` and upgrades to Core when the adapter allows it; when it cannot, three.js sets `renderer._samples = 0` (MSAA off) and limits MRT blending.
- WebXR over the WebGPU backend needs `XRGPUBinding`, which ships on Apple Vision Pro (visionOS Safari) and experimentally on Chrome for Windows and Android XR, and explicitly "is not implemented on Meta Quest" (three.js issue 32858). See `webxr`.

## Pitfalls

- Treating a caniuse percentage as "my page works there": caniuse counts every Chrome for Android build as supported, but real WebGPU needs Android 12+ and a supported GPU family; actual adapter availability is lower by an unverified amount. Always check `renderer.backend.isWebGPUBackend` at runtime rather than trusting a browser-version check.
- Headless CI and cloud containers: `navigator.gpu` can be undefined, or `requestAdapter()` can return `null`, and WebGPU needs a secure context (`https:` or `http://localhost`, never `file://`). Puppeteer and Playwright default launch flags do not enable a WebGPU adapter; without one, `WebGPURenderer` silently renders on the WebGL 2 fallback, which is correct behavior but changes pixels versus a real WebGPU run. `tw check` reports the backend it actually got (see `webgpu-backend-check`).
- Assuming a promised "production ready" date: no dated three.js announcement makes WebGPURenderer the default, and the manual still calls it experimental as of r186. Sources claiming otherwise (for example "r171 made WebGPURenderer production ready") are wrong: r171 only added the `three/webgpu` and `three/tsl` entry points.
- Building for compatibility mode and forgetting antialiasing: without MSAA, hard edges show jaggies that a WebGL page with the same geometry would not have. Add an FXAA, SMAA or TRAA node from `three/addons/tsl/display/` when `renderer.backend.compatibilityMode` is true.
- iOS Safari 18 and older devices get nothing from the WebGPU code path, not even the fallback message you might expect from a desktop browser lacking WebGPU; they simply run WebGL 2. Test on an old-enough real device or emulate the absence with `?webgl` (see `webgpu-backend-check`) rather than assuming coverage from a WebGPU feature you never gated.

## Verify

- `tw check <page>` prints `renderer: WebGPURenderer (WebGPU backend)` or `renderer: WebGPURenderer (WebGL2 fallback)`; use `--gl swiftshader` or the recipe in `webgpu-backend-check` to force and check the fallback path deliberately.
- `tw check <page> --eval "renderer.backend.compatibilityMode"` reports whether the adapter landed in compatibility mode; `true` means expect no MSAA.
- `tw doctor` reports whether the local Chrome exposes a WebGPU adapter at all, which explains a fallback before you debug the page.

## Notes

- 2026-09-26: written from the direction research's WebGPU support matrix (gpuweb Implementation Status wiki, last edit 2026-08-13; caniuse dataset updated 2026-09-24; MDN Firefox release notes) and its compatibility-mode section (r186 `WebGPUBackend` source, checked against the installed three).
