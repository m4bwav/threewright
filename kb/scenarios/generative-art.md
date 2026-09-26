---
title: Generative art and creative coding
slug: generative-art
kind: scenario
summary: WebGPURenderer with TSL for shader art and GPU compute; determinism from a seeded PRNG, never Math.random(), Date.now() or frame time, for platforms that hash the output.
tags: [generative art, tsl, webgpu, compute, determinism, fxhash, seeded randomness, creative coding]
applies_to: ">=r183"
status: current
renderer: webgpu
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-scenarios-xr-and-testing.md, ai-docs/research/2026-09-26-direction.md]
related: [tsl, webgpu-support, seeded-randomness, tsl-custom-material, renderer-choice, webgpu-backend-check]
template: html-webgpu
---

# Generative art and creative coding

## When

- Shader art, particle systems, fluid or reaction-diffusion simulations, and any piece where the visual comes from a compute or shader pipeline rather than an authored model.
- Output must be reproducible: fxhash and similar platforms require the same output for the same token hash, so the generative step has to be a pure function of a seed.
- One piece should run on both WebGPU and its WebGL2 fallback with no separate code paths: TSL compiles to WGSL or GLSL from the same source.

## Stack

- `WebGPURenderer` with TSL is the default here: TSL is "the new shader standard for three.js," new compute and post nodes land there first, and one TSL source runs on both backends. Fall back to `WebGLRenderer` with GLSL only if the deployment platform captures previews headless with no GPU at all and needs bit-identical output across every viewer (pin `forceWebGL: true` with the same TSL source, or plain GLSL).
- Compute: `Fn(...)().compute(count)` with `renderer.compute()` for particles, fluid, reaction-diffusion. The WebGL2 fallback backend emulates only 1D compute (a single count, no indirect or multi-dimensional dispatch), so keep compute shapes to a single number if the piece must also run there.
- References: the TSL Guide (threejs.org/tsl/) for syntax, compute, and the render pipeline; Maxime Heckel's "Field Guide to TSL and WebGPU"; the Makio64 advanced TSL repo.

## Build

- No verified generative-art template exists yet. Start from `tw new html-webgpu <dir>` (verified on the WebGL2 fallback in this container; the native WebGPU backend is unverified here, see Pitfalls) and build the TSL material and compute pipeline from there.
- Seed everything from one value: a seeded PRNG (mulberry32 or sfc32) drives both CPU-side composition logic and any GPU noise; never call `Math.random()`, `Date.now()`, or read frame time inside the generative step itself.
- For fxhash-style platforms, use `$fx.rand()` (seeded by the token hash) for the main draw and `$fx.randAt()` for lineage variations; render at a fixed internal resolution and scale only for the platform's preview capture, so the composition itself never depends on viewport size.
- Keep the composition logic (what to draw, at what parameters) on the CPU and deterministic; GPU floating-point differences across vendors can still shift individual pixels even with an identical seed, so do not rely on pixel-perfect GPU output across devices for anything the piece's identity depends on.
- `RenderPipeline` with TSL display nodes for post effects (bloom, and other node-based passes) on the WebGPU path; do not reach for pmndrs `postprocessing` or `EffectComposer` here, since they are WebGL only and this scenario's default is WebGPU.

## Pitfalls

- Frame-rate-dependent motion breaks reproducibility across machines; drive any time-based animation from a fixed step or an explicit progress value, the same discipline as video capture.
- Canvas preview-capture timing: a platform that screenshots the canvas at a fixed delay after load can catch the piece mid-animation if the first frame is not fully settled; render once synchronously (or wait for a ready signal) before that capture point.
- Different results across the WebGPU and WebGL2 backends are possible even from identical TSL source, due to floating-point and scheduling differences; if bit-identical output across backends matters, verify it directly rather than assuming TSL guarantees it.
- This container's Chromium (141, Playwright build) has a WebGPU adapter via SwiftShader, but three r186's WebGPU backend throws there (`swizzle: 'rgba'` is not a `GPUTextureComponentSwizzle`), so WebGPU-backend-specific claims here are checked on the WebGL2 fallback only; verify on a current real Chrome before shipping a WebGPU-backend-only feature.

## Verify

- `tw check <page>` is `result: OK`, and log `renderer.backend.isWebGPUBackend` once at startup so a silent fallback to WebGL2 is visible in the check output, not just inferred.
- Run the generative step twice with the same seed (two page loads, or `tw check --eval` calling the seed function directly) and diff the resulting parameters or a small canvas capture; identical seeds must give identical composition parameters.
- `tw shot <page> --size 640x360` for one look at the piece; use `tw video` with a virtual clock, not real playback, if the piece is animated and needs a capture for review.

## Notes

- 2026-09-26: written from the 2026-09-26 research (scenarios-xr-and-testing A7, direction). Whether TSL guarantees bit-identical output across WebGPU and its WebGL2 fallback was not confirmed and should be treated as unverified.
