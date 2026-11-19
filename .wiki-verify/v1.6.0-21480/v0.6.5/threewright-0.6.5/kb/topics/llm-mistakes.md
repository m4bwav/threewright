---
title: How LLMs get three.js wrong
slug: llm-mistakes
kind: topic
summary: The recurring mistake classes models make writing three.js code, ordered by frequency, with the r186 fix for each.
tags: [llm, mistakes, stale api, hallucination, lint, era mixing]
applies_to: r186
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-ai-skills-and-docs.md]
related: [current-vs-legacy, agent-tooling, testing]
---

# How LLMs get three.js wrong

## Essentials

- Evidence base: WorldCoder-Bench (2,026 self-contained three.js tasks, best model 19.9% on its robust split, failures concentrated in "state-schema drift, broken interaction chains, and runtime state synchronization" rather than visual absence); Web-Bench (a 3D Snake project among 50, best model 25.1% Pass@1 overall); practitioner write-ups describing models that "mix API eras (deprecated geometry classes, old lighting units)" and "rarely instance or dispose properly", and TSL output with "deprecated imports, phantom functions that don't exist, and compute shaders that compile but render nothing". Treat all of the above as directional evidence, not a precise ranking.
- Recurring mistake classes, ordered by how often the evidence above shows them (a judgment, not a measurement):
  1. **Era mixing**: script-tag builds, `THREE.OrbitControls` off the global namespace, `examples/js` paths, an r128-era CDN URL, renamed classes and constants from a memorized older tutorial.
  2. **Module resolution**: missing import-map keys (`three/addons/`, `three/webgpu`), extensionless addon paths, unpinned or mixed CDN versions, loading modules from `file://`.
  3. **WebGPU path errors**: GLSL `ShaderMaterial`, `onBeforeCompile` or `EffectComposer` used with `WebGPURenderer`; WebGPU classes imported from bare `'three'`; rendering before `await renderer.init()`; deprecated `*Async` calls; pre-r167 WebGPU addon paths.
  4. **Silent visual failures**: dark scenes from pre-r155 light values, a missing `OutputPass`, an untagged texture color space, an ignored `linewidth`, an ignored `TextGeometry` `height`, an animation that never actually advances because nothing is time-driven.
  5. **State and interaction bugs** in interactive/game code (the WorldCoder-Bench finding: UI state and simulation state drift apart, or an interaction chain breaks partway through, even when the page renders correctly).
  6. **Resource hygiene**: no `.dispose()` on removed geometries/materials/textures, no instancing for repeated meshes.
  7. **Invented TSL functions**: a plausible-sounding name that does not exist in the installed `three/tsl`.
  8. **Upstream noise misread as a bug**: `@react-three/fiber` 9.8.1 itself triggers the `Clock` and `PCFSoftShadowMap` deprecation warnings internally, so a model that "fixes every console warning" can end up editing the wrong code trying to silence a warning R3F produces on its own.
- Every era-mixing, module-resolution and WebGPU-path mistake in this list has a matching regex in `kb/rules/lint-rules.json`, checked against positive samples (what models write) and negative samples (correct r186 code) with zero failures across 134 rules, and against all 607 official r186 examples with only one incidental warning. Running `tw lint` before trusting hand-written or model-written code catches most of classes 1-3 immediately, in text, for a few lines of output.
- Classes 4-7 need runtime or scene-level checking, not just static regexes, which is exactly what `tw check`'s runtime warnings, pixel statistics and `renderer.info` counts are for (see `verification-ladder`). Class 5 (state bugs in interactive code) needs scripted input and an exposed state hook, not a visual check at all.

## Pitfalls

- Trusting a model's own claim that code "should work" without running `tw lint` first: every mistake class above except state bugs and dispose hygiene is catchable by a static regex, at a cost of a few lines of text.
- Fixing every console warning indiscriminately: R3F itself warns about `Clock` and `PCFSoftShadowMap` on its own initialization, so "fix the warning" instructions can send a model hunting through your code for something that is not there.
- Accepting a TSL import at face value because it "sounds right": check it against the installed `node_modules/three/src/nodes` (or the TSL Guide) rather than trusting a plausible function name, since invented TSL functions are a documented failure mode.
- Judging an interactive page or game "done" from a clean `tw check` alone: state-and-interaction bugs (WorldCoder-Bench's dominant failure mode) do not show up as console errors or scene warnings; they need scripted input and an assertion on the resulting state.
- Assuming a stale pattern from an old, popular tutorial is still current just because it appears often in training data: `THREE.OrbitControls` as a global, script-tag builds, and `outputEncoding`/`sRGBEncoding` are exactly the kind of high-frequency, long-dead pattern that keeps reappearing in model output years after removal.

## Verify

- `tw lint <dir>` is the single highest-value first check for model-written three.js code: it catches era mixing, module resolution and WebGPU-path errors in text, before any browser runs at all.
- `tw check <page>` catches silent visual failures (dark scenes, missing `OutputPass`, frozen animation) through its runtime warnings and pixel statistics, without needing a human to look at anything.
- For interactive or game code specifically, verification needs a scripted input sequence plus an assertion on exposed state (see `testing`), since static lint and a clean render both miss state-and-interaction bugs by design.

## Notes

- 2026-09-26: written from the ai-skills-and-docs research (sections 3.1-3.6), which cites WorldCoder-Bench (arXiv 2606.01869), Web-Bench (arXiv 2505.07473) and lint verification the research ran against the installed three 0.186.1 and 607 official r186 examples.
