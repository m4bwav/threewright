---
title: GSAP
kind: library
slug: gsap
summary: Timeline and ScrollTrigger animation library, free for all commercial use since 2025; the default engine for scroll storytelling and scripted camera moves.
tags: [gsap, scrolltrigger, animation, timeline, scroll storytelling, license]
applies_to: any
status: current
renderer: none
last_verified: 2026-09-26
sources: [https://gsap.com/community/standard-license/, https://webflow.com/blog/gsap-becomes-free, ai-docs/research/2026-09-26-ecosystem-libraries.md, ai-docs/research/2026-09-26-scenarios-xr-and-testing.md]
related: [scroll-storytelling, lenis, animation-and-time]
package: "gsap"
version_checked: "3.15.0"
---

# GSAP

## Use it for

- Scroll-driven storytelling: a GSAP timeline scrubbed by `ScrollTrigger`, driving camera position, material uniforms or object transforms as the page scrolls.
- Scripted camera and object animation outside of scroll too: intros, transitions, deterministic seeks (`timeline.progress(t)`) for video capture.
- Renderer-agnostic tweening: it animates plain JS object properties, so it works identically with vanilla three.js, R3F refs, or DOM elements in the same page.

## Avoid it when

- The project needs a visual, no-code animation builder that competes with Webflow: GSAP's "no charge" standard license explicitly bars "Competitive Products" of that kind, even though it is free for ordinary commercial use.
- Only a handful of simple tweens are needed with no timeline complexity: `@tweenjs/tween.js` (shipped inside three's own examples) is smaller for that case.

## Setup

Versions checked 2026-09-26: `gsap` 3.15.0 (2026-04-13). Free for commercial use with all plugins since April 2025 (Webflow sponsorship), but it is not an OSI open-source license: the GSAP Standard "no charge" license bars building a competing visual animation-builder product with it.

```sh
npm install gsap@3.15.0
```

```js
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

const tl = gsap.timeline({
  scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
});
tl.to(camera.position, { z: 2, ease: 'none' }, 0)
  .to(mesh.material.uniforms.uProgress, { value: 1, ease: 'none' }, 0);
```

Deterministic seek for capture, no scroll:

```js
tl.progress(elapsedSeconds / tl.duration());
```

## Pitfalls

- Two rAF loops fighting is the most common bug: sync GSAP's own ticker with any smooth-scroll library instead of running both independently (see the `lenis` entry for the exact wiring). Run one `requestAnimationFrame` loop for the whole page.
- `scrub: true` reads scroll position every frame; keep the actual heavy work (uniform updates, matrix math) in the render loop reading a progress value set by GSAP, not inside GSAP callbacks themselves.
- `respectPrefersReducedMotion` is not automatic; check `matchMedia('(prefers-reduced-motion: reduce)')` yourself and disable scroll scrubbing and camera flights when it is set (see the `scroll-storytelling` scenario).
- Deterministic video capture must call `progress()` explicitly per frame; letting a `scrub` timeline run on real scroll events during a headless capture pass gives non-reproducible frames.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries, scenarios-xr-and-testing).
