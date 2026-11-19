---
title: Lenis
kind: library
slug: lenis
summary: Smooth-scroll library that honors prefers-reduced-motion by default; pairs with GSAP's ticker for one shared rAF loop in scroll storytelling.
tags: [lenis, smooth scroll, scrolltrigger, reduced motion, scroll storytelling]
applies_to: any
status: current
renderer: none
last_verified: 2026-09-26
sources: [https://github.com/darkroomengineering/lenis, ai-docs/research/2026-09-26-ecosystem-libraries.md, ai-docs/research/2026-09-26-scenarios-xr-and-testing.md]
related: [gsap, scroll-storytelling, accessibility]
package: "lenis"
version_checked: "1.3.26"
---

# Lenis

## Use it for

- Smooth, physics-feeling page scroll behind a persistent three.js canvas, the default pairing with GSAP `ScrollTrigger` for scroll storytelling.
- Any scroll-driven page where the raw scroll event stream is too jittery to scrub animation from directly.

## Avoid it when

- The page already has its own scroll-hijacking mechanism (drei `ScrollControls`, a custom wheel handler): running two smooth-scroll systems on the same page fights and produces visible stutter.
- Reduced motion must fully disable smooth scrolling and Lenis's default only softens it: check the actual behavior against `prefers-reduced-motion` for the target version and disable Lenis outright if needed, rather than assuming its default is sufficient.

## Setup

Versions checked 2026-09-26: `lenis` 1.3.26 (2026-08-05). A `2.0.0-dev` line exists on the `dev` dist-tag; stay on 1.x for production. Its README states it honors `prefers-reduced-motion` by default.

```sh
npm install lenis@1.3.26 gsap@3.15.0
```

```js
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis();
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

## Pitfalls

- Run exactly one `requestAnimationFrame` driver for the whole page. Feeding Lenis from `gsap.ticker` (as above) and letting `ScrollTrigger.update` fire on Lenis's `scroll` event keeps GSAP, Lenis and the three.js render loop from fighting over frame timing.
- `gsap.ticker.lagSmoothing(0)` matters here: GSAP's default lag smoothing can desync from Lenis's own scroll physics after a long tab-hidden pause.
- Scroll hijacking, smooth or not, can break keyboard and screen-reader navigation; test Tab and Page Down navigation on any page that adds Lenis, and provide a way to disable it.
- Test reduced motion explicitly (`page.emulateMedia({ reducedMotion: 'reduce' })` in Playwright) rather than trusting that Lenis's default covers every case a project needs.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries, scenarios-xr-and-testing).
