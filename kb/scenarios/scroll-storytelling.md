---
title: Scroll-driven storytelling and hero sections
slug: scroll-storytelling
kind: scenario
summary: One persistent canvas driven by a GSAP timeline scrubbed with ScrollTrigger and smoothed by Lenis, with a poster fallback and a reduced-motion branch.
tags: [scroll, gsap, scrolltrigger, lenis, hero, marketing, storytelling, reduced motion]
applies_to: ">=r167"
status: current
renderer: webgl
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-scenarios-xr-and-testing.md, ai-docs/research/2026-09-26-direction.md, https://github.com/darkroomengineering/lenis]
related: [gsap, lenis, react-three-fiber, renderer-choice, accessibility, keyboard-orbit-and-reduced-motion, render-on-demand]
template: html-importmap
---

# Scroll-driven storytelling and hero sections

## When

- A marketing page needs a 3D hero or a scroll-scrubbed story: the camera or a model changes as the visitor scrolls, and the effect should feel connected to scroll position, not to elapsed time.
- The team is comfortable adding GSAP (free for commercial use, all plugins, since 2025) and either vanilla three.js or React Three Fiber.
- Not for a page where scroll hijacking would break keyboard or screen-reader navigation and no accessible fallback is planned; build a straightforward page instead.

## Stack

| need | first choice |
|---|---|
| vanilla three.js hero | three.js + GSAP 3 with ScrollTrigger + Lenis for smooth scroll |
| React hero | R3F + drei `ScrollControls`/`useScroll`, or R3F plus GSAP timelines driven by ScrollTrigger |
| page transitions between sections | the View Transitions API (Chrome, Edge, Opera, Firefox by mid-2026; not yet Baseline, Safari gap) |

- `WebGLRenderer` is the default: smaller bundle for a fast LCP, and most of this stack (pmndrs postprocessing, GSAP, Lenis) is WebGL-oriented anyway (`renderer-choice`). Move to `WebGPURenderer` only if the effect itself needs TSL compute (particles, fluid).

## Build

- No verified `scroll-hero` template exists yet (it is planned but not built). Start from `tw new html-importmap <dir>` for vanilla, or `tw new r3f <dir>` for React, and add the scroll stack by hand.
- One persistent canvas, fixed behind the DOM — never one canvas per section.
- Drive a GSAP timeline from scroll progress; scrub camera position and material uniforms from it. Keep scroll logic out of the render loop itself; read a progress value inside the loop instead.
- Sync Lenis to the GSAP ticker so only one `requestAnimationFrame` loop runs the whole page: `gsap.ticker.add((time) => lenis.raf(time * 1000))`, call `ScrollTrigger.update` on Lenis's `scroll` event, and set `gsap.ticker.lagSmoothing(0)`.
- drei `ScrollControls` builds an HTML scroll container over the canvas; `pages` sets its height in viewport units, and `useScroll().range()`/`curve()` map sections to progress values.
- Render on demand while idle (`frameloop="demand"` in R3F, or a manual dirty flag in vanilla three.js) and pause the loop when the canvas scrolls off screen with an `IntersectionObserver`.
- Swap the canvas for a poster image or a short video until the hero GLB is ready, so Largest Contentful Paint is an image, not a WebGL frame; precompile shaders (`renderer.compileAsync` or `compile`) before the first reveal so scroll does not hitch on first use.

## Pitfalls

- Two `requestAnimationFrame` loops fighting (Lenis, GSAP and R3F all running their own) is the most common bug; wire Lenis into GSAP's ticker as shown above so there is exactly one driver.
- Scroll hijacking that breaks keyboard and screen-reader navigation: test Tab and Page Down on every scroll-storytelling page, and provide a way to reach all content without scroll scrubbing.
- Uncapped `devicePixelRatio` on phones; cap at 2 (1.5 on low-end phones).
- Loading a 20 MB hero model before first paint; budget the above-the-fold model to a few MB, compressed with Meshopt or Draco, KTX2 textures at 2048 px or less.
- Shader compile hitches on first scroll: precompile with `compileAsync` while the poster image is still showing.

## Pitfalls (accessibility)

- Check `matchMedia('(prefers-reduced-motion: reduce)')`. With it set: disable scroll scrubbing and camera flights, show the final state of each section, and stop any autoplay.
- Offer a static-image path when WebGL2 is missing or `renderer.capabilities` reports a weak GPU.
- Test reduced motion in Playwright with `page.emulateMedia({ reducedMotion: 'reduce' })` before calling the page done.

## Verify

- `tw check <page> --reduced-motion` passes with the camera not moving between two shots when reduced motion is requested.
- `tw check <page>` is `result: OK` with no console errors and a sane scene (camera inside the intended frustum at scroll position 0).
- `tw shot <page> --size 960x540` at a few scroll positions (top, middle, end) for a framing check; drive the timeline's `progress()` directly for a deterministic capture rather than scrolling a real page.
- Manual keyboard-only pass: Tab and Page Down still reach every section without the scroll hijack trapping focus.

## Notes

- 2026-09-26: written from the 2026-09-26 research (scenarios-xr-and-testing A1, direction). The View Transitions API's cross-browser status and GSAP's free-license terms are the claims most likely to change.
