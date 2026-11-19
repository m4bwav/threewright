---
title: Theatre.js
kind: library
slug: theatre
summary: Designer-facing keyframe animation editor for three.js and R3F, frozen in public since 2024 while a 1.0 develops privately; use only when the visual editor itself is the point.
tags: [theatre.js, keyframes, animation editor, r3f, legacy, agpl]
applies_to: "<r186"
status: legacy
superseded_by: gsap
renderer: both
last_verified: 2026-09-26
sources: [https://github.com/theatre-js/theatre, ai-docs/research/2026-09-26-ecosystem-libraries.md, ai-docs/research/2026-09-26-video-and-games.md]
related: [gsap, react-three-fiber]
package: "@theatre/core"
version_checked: "0.7.2"
---

# Theatre.js

## Use it for

- The one case its replacement (GSAP) does not cover: a visual, scrubbable keyframe editor a non-coder can use to animate a three.js or R3F scene directly in the browser (`@theatre/studio`).
- Reading or maintaining an existing project already built on Theatre.js sequences, including seeking a sequence to an exact time per frame during deterministic video capture.

## Avoid it when

- Starting new animation work: the public packages have not shipped since 0.7.2 (2024-05-19); the README says "Theatre.js 1.0 is around the corner" while development moved to a private repository, so the public line is effectively frozen. Use GSAP timelines for anything code-driven.
- The project uses React Three Fiber 9: `@theatre/r3f`'s peer range caps at `@react-three/fiber ^8.13.6`, so it does not install cleanly against current R3F.
- Shipping `@theatre/studio` (the editor) to production: it is AGPL-3.0-only, a strongly copyleft license unsuitable for most closed-source products. `@theatre/core` itself is Apache-2.0 and safe to ship; the studio editor is not.

## Setup

Versions checked 2026-09-26: `@theatre/core` 0.7.2, `@theatre/studio` 0.7.2, `@theatre/r3f` 0.7.2, all published 2024-05-19.

```js legacy
// Existing-project pattern; do not start new animation work on this stack.
import { getProject } from '@theatre/core';
import studio from '@theatre/studio';
studio.initialize();

const sheet = getProject('Demo').sheet('Scene');
const obj = sheet.object('Camera', { x: 0, y: 0, z: 5 });
obj.onValuesChange((values) => { camera.position.set(values.x, values.y, values.z); });
```

## Pitfalls

- Never ship `@theatre/studio` in a production bundle; its AGPL-3.0 license requires releasing your combined work's source under compatible terms if you distribute it. Strip it from the production build and keep it dev-only.
- `@theatre/r3f`'s R3F 8 peer cap means it is not a fit for any project already on R3F 9 or 10; check the installed R3F major version before suggesting this package.
- Because it is frozen in public, do not expect fixes for compatibility with current three.js or React versions; treat any integration work as a one-off maintenance task, not an ongoing dependency relationship.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries, video-and-games). Recorded as `status: legacy` per the kb slug plan; GSAP timelines are the current path for code-driven animation, with Theatre kept only where a designer specifically needs the visual editor and can accept a pinned, unmaintained dependency.
