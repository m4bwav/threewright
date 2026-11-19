---
title: Headless three.js and CI
slug: headless-and-ci
kind: topic
summary: What runs a three.js page without a real GPU, the SwiftShader flag Chrome now requires, and why WebGPU often silently falls back in CI.
tags: [headless, ci, swiftshader, puppeteer, playwright, webgl, webgpu, xvfb]
applies_to: any
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-scenarios-xr-and-testing.md, ai-docs/research/2026-09-26-3d-dataviz-and-docs.md, ai-docs/research/2026-09-26-direction.md]
related: [testing, webgpu-support, webgpu-backend-check, capture-stills-and-video]
---

# Headless three.js and CI

## Essentials

- Chrome deprecated and then removed the automatic fallback to SwiftShader for WebGL (warning since Chrome 130). Without a real GPU, WebGL context creation now fails unless the browser is launched with `--enable-unsafe-swiftshader` (commonly paired with `--use-angle=swiftshader`). A page that used to "just work" headless can start failing after a Chrome upgrade purely because of this flag change.
- SwiftShader is deterministic across runs (useful for pixel-diff testing) but slow: one team measured 30-second canvas startup and 5+ minute suites, with flakiness from timeouts. A real GPU runner with headed Chromium under `xvfb`, `--use-angle=vulkan`, and loaded NVIDIA kernel modules cut canvas load to under 1 second and total suite time to about 1.4 minutes, at 3-4x the per-minute machine price. Three.js's own CI uses `xvfb-run` plus Vulkan drivers on `ubuntu-latest`.
- WebGPU in a headless container is a separate problem from WebGL: `navigator.gpu` can be missing or `requestAdapter()` can return `null` even where SwiftShader gives you a working WebGL context, because SwiftShader's Vulkan path (needed for WebGPU) requires the Vulkan loader and a Mesa ICD that many minimal containers do not have. `--enable-unsafe-webgpu --enable-features=Vulkan` is the flag set three.js's own e2e tests use for WebGPU. `WebGPURenderer` hides the absence of an adapter by quietly rendering on its WebGL 2 fallback, so a headless run can look successful while never touching the WebGPU backend at all; always log `renderer.backend.isWebGPUBackend` (see `webgpu-backend-check`).
- WebGPU also needs a secure context: `https:` or `http://localhost` works, `file://` and `about:blank` do not. Serve the page from a local static server rather than opening the HTML file directly, for WebGL module imports too (bare `file://` module scripts are blocked by Chrome regardless of WebGPU).
- Baseline images differ across platforms: generate visual-regression baselines in the same Docker image CI runs, not on a developer's macOS or Windows machine, because ANGLE backend differences between platforms are the main source of "passes locally, fails in CI".
- `tw check`, `tw shot`, `tw sheet` and `tw video` already run with `--no-sandbox` as root, find Playwright and Puppeteer browsers, allow the software WebGL fallback, and enable WebGPU on Linux via Vulkan where available; `tw doctor` reports what the current container actually supports (Chrome, GPU, WebGL, WebGPU, ffmpeg) before you debug a page.

## Pitfalls

- Assuming a headless failure is a bug in the page: check `tw doctor` (or the equivalent flag audit) first, since a missing `--enable-unsafe-swiftshader` flag or a missing Vulkan ICD produces the exact same blank-canvas symptom as broken page code.
- Opening the HTML file with `file://` in a headless run: module scripts and WebGPU's secure-context requirement both fail silently or with a generic error that does not point at the real cause.
- Trusting a "WebGPU ran" report from a CI job that never checked `renderer.backend.isWebGPUBackend`: the WebGL 2 fallback renders successfully too, so a green build proves nothing about which backend actually ran unless the check is explicit.
- Comparing screenshots taken on different OSes (a developer's laptop versus the CI image) as if they were the same baseline: ANGLE and driver differences move enough pixels to make every diff look like a regression.
- Retrying a flaky SwiftShader-based test instead of raising its timeout or moving to a GPU runner: SwiftShader's slowness, not nondeterminism, is usually the real cause of a headless CI timeout.

## Verify

- `tw doctor` reports Node, Chrome, ffmpeg, npm, CDN reach, and whether the local headless Chrome actually exposes WebGL and WebGPU; read this before debugging a specific page.
- `tw check <page>` prints the renderer and backend line (see `webgpu-backend-check`) and lists FAILED REQUESTS, which catches a `file://` module-resolution failure immediately.
- `tw check <page> --gl swiftshader` (or `--gl gpu`) lets you force one path and compare its output against the other deliberately, rather than discovering the difference by accident in CI.

## Notes

- 2026-09-26: written from the scenarios research (sections B3, B4) on SwiftShader flags, GPU runner comparisons and baseline platform consistency, and the direction research (section 3.6, section "Risks to teach with the table" item 1) on WebGPU adapter absence in headless containers.
