---
title: Testing three.js code
slug: testing
kind: topic
summary: What runs in plain Node without a GPU, visual regression with Playwright, and how three.js tests its own 607 examples.
tags: [testing, vitest, playwright, unit test, visual regression, puppeteer]
applies_to: any
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-scenarios-xr-and-testing.md, ai-docs/research/2026-09-26-games.md]
related: [headless-and-ci, verification-ladder, capture-stills-and-video]
---

# Testing three.js code

## Essentials

- Three layers, cheapest first: static lint of the source, unit tests of math and scene-graph logic in plain Node, and visual regression through a real browser. Reach for the browser layer only when the first two cannot answer the question (see `verification-ladder`).
- What works in plain Node with no WebGL at all: `Vector3`, `Matrix4`, `Quaternion`, `Box3`, `Ray` and other math classes; scene-graph operations (`Object3D.traverse`, adding/removing children); raycasting against geometry; animation mixers stepped by hand; `BufferGeometry` construction; loaders that parse an already-fetched buffer (`GLTFLoader.parse()` with a buffer, with texture loading stubbed). A plain Node test runner (or Vitest in its `node` environment) is fine for all of this.
- What does not work in jsdom: `canvas.getContext('webgl2')` returns `null` in jsdom, so `new WebGLRenderer()` throws. Keep render calls behind a thin interface and inject a fake renderer (`render`, `setSize`, `info`, `dispose`) for tests that should not need a real context, and assert on what you asked to render, not on pixels. `headless-gl` (npm `gl`) only implements WebGL 1.0.3 and cannot run the current `WebGLRenderer`, which needs WebGL 2 since r163; treat it as dead for three.js.
- Vitest's browser mode (stable in Vitest 4 with a Playwright provider) runs tests in real Chromium, Firefox or WebKit, so WebGL and WebGPU both actually work; this is the current default choice for "a unit test that needs a real graphics context".
- Visual regression with Playwright: `expect(page).toHaveScreenshot()` with a `threshold` (per-pixel tolerance, default 0.2) and `maxDiffPixelRatio` or `maxDiffPixels`; for a WebGL canvas use about 0.01-0.02 `maxDiffPixelRatio`, looser than the default. Remove nondeterminism before comparing: freeze time (`page.clock`), seed or replace `Math.random`, pass a fixed `dt` into any hand-driven animation, disable autoplay, emulate reduced motion, and wait for an explicit ready signal (a `window.__ready === true` flag set after the first frame following asset load) with `page.waitForFunction` rather than a fixed sleep. Screenshot the canvas locator specifically, not the whole page.
- Three.js's own e2e suite (dev branch, read 2026-09-26) is the reference shape: it loads each of 607 examples, waits for network idle plus about 1 second per MB of page data, captures at 400x250 (rendered at 2x then downscaled), replaces `Math.random()` for determinism, and fails when more than 0.1% of pixels differ at a 0.1 per-pixel threshold. Tiny screenshots, a fixed seed, a settled-render wait, and a percentage pixel budget are enough to catch regressions across hundreds of pages; there is no need for full-resolution screenshots in a regression suite.
- Structural checks answer most bugs without a screenshot at all: `renderer.info` counts (draw calls, triangles, memory), a capped scene-graph dump with repeated siblings collapsed, and glTF validation (`gltf-transform validate`/`inspect`, or `gltf-validator`). See `verification-ladder` and `memory-and-disposal`.

## Pitfalls

- Constructing a real `WebGLRenderer` inside a jsdom-based unit test: it throws immediately, not a silent no-op, because `getContext('webgl2')` returns `null` there.
- Comparing screenshots at full page resolution when 400x250 or similar would catch the same regression: bigger images cost more to generate, store, diff and (for an agent) read, with no gain in what a percentage-pixel-difference test can detect.
- Letting `Math.random()`, `Date.now()` or unthrottled `requestAnimationFrame` timing drive anything a screenshot test compares: any of the three makes a "regression" appear on every run even when nothing changed.
- Generating baseline screenshots on a developer machine and running comparisons in CI: platform differences in the graphics stack move enough pixels to make every diff look like a failure (see `headless-and-ci`).
- Reaching for a screenshot to answer a question a text check already answers (a missing model, a shader compile error, a lit-but-unlit scene): the verification ladder exists precisely to avoid this.

## Verify

- `tw check <page>` is the default proof that a page works: `result: OK` means no exceptions, no console errors, no failed requests and no scene warnings; report those lines rather than "it looks fine" (see `verification-ladder`).
- `tw diff <a.png> <b.png> --threshold 0.1 --max 0.001` gives a PASS/FAIL pixel comparison in the same shape three.js's own e2e suite uses, for the cases that do need a visual regression check.
- `node --test tests/*.test.mjs` (not a bare `tests/` folder, which Node 22 does not expand) runs threewright's own unit and browser tests as the template for a project's own suite.

## Notes

- 2026-09-26: written from the scenarios research (sections B1-B4), citing three.js's own dev-branch e2e script, CI workflow and package.json scripts, and the games research (section 8) on harness recommendations for a game specifically.
