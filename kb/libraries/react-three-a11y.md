---
title: "@react-three/a11y"
kind: library
slug: react-three-a11y
summary: Dormant since 2022 with only a docs-build commit since; no maintained 3D accessibility library was found, so build accessibility with DOM equivalents instead.
tags: [accessibility, a11y, react-three-fiber, legacy, dormant]
applies_to: "<r186"
status: legacy
superseded_by: accessibility
renderer: webgl
last_verified: 2026-09-26
sources: [https://github.com/pmndrs/react-three-a11y, ai-docs/research/2026-09-26-ecosystem-libraries.md]
related: [react-three-fiber, css2d-labels]
package: "@react-three/a11y"
version_checked: "3.0.0"
---

# @react-three/a11y

## Use it for

- Nothing new. It is listed here so an agent that finds it in search results knows its status before recommending it.

## Avoid it when

- Always, for new work: 3.0.0 shipped 2022-05-15 and the code itself has been unchanged since; the only later commit (2026-08-20) was a docs-build change, not a feature or fix. No maintained successor 3D accessibility library was found in the 2026-09-26 research.

## Setup

Versions checked 2026-09-26: `@react-three/a11y` 3.0.0 (2022-05-15), peer `three >=0.133.0`, `@react-three/fiber >=8`. 16 open issues, no maintainer activity beyond the one docs commit.

```js legacy
// Historical pattern; do not add this dependency to new code.
import { A11yUserPreferences, A11y } from '@react-three/a11y';
```

## Pitfalls

- Its peer range (`fiber >=8`) predates R3F 9's changes; even if you wanted to use it, expect peer-dependency conflicts on a current project.
- Do not treat its existence as evidence that "3D accessibility is solved" — it solved a narrow slice (focus rings and ARIA-like roles on R3F meshes) and has not kept pace with anything since.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries). Build accessibility instead from DOM-first primitives: drei `Html` or CSS2DRenderer labels for text, a real HTML data table, keyboard handlers, `aria-live` regions, and `prefers-reduced-motion` checks, all covered in the `accessibility` topic and the `avatars-and-characters`/`3d-chart-in-docs` scenarios.
