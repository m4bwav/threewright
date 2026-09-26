---
title: three-stdlib
kind: library
slug: three-stdlib
summary: WebGL-era copies of three.js addons as an npm package; drei 11 drops it, and new code should import three/addons/* directly instead.
tags: [three-stdlib, addons, drei, legacy, pmndrs]
applies_to: "<r186"
status: legacy
superseded_by: import-maps-and-builds
renderer: webgl
last_verified: 2026-09-26
sources: [https://github.com/pmndrs/three-stdlib, ai-docs/research/2026-09-26-ecosystem-libraries.md]
related: [drei, react-three-fiber]
package: "three-stdlib"
version_checked: "2.36.1"
---

# three-stdlib

## Use it for

- Nothing new. It exists as a dependency drei 10 still pulls in (`^2.35.6`) for helpers it has not yet ported to import directly from `three/addons`; you generally do not add it to a project yourself.
- Reading or porting an older project that imports from it, to understand what it is doing before replacing the import.

## Avoid it when

- Writing any new import: use `three/addons/...` (three's own package export) instead of `three-stdlib`'s copies. They track three's addons less tightly and add an extra dependency for no benefit.
- The project uses drei 11 (alpha): it has already dropped `three-stdlib` as a dependency, so relying on it there is doubly wrong.

## Setup

Versions checked 2026-09-26: `three-stdlib` 2.36.1, published 2025-11-10 (last push to the repo 2026-06-26, so it still receives occasional maintenance, but no new addon ports were found). Peer `three >=0.128.0`.

```js legacy
// Old pattern: avoid in new code.
import { OrbitControls } from 'three-stdlib';
```

```js
// Current pattern.
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
```

## Pitfalls

- Installing `three-stdlib` directly alongside `three/addons` imports elsewhere in the same project risks two different copies of the same addon class, which can break `instanceof` checks against controls or loaders.
- It is a transitive dependency of drei 10; you rarely need to add it yourself. If `npm ls three-stdlib` shows it, trace who pulled it in (usually drei) rather than assuming your own code needs it.
- Because it is "WebGL-era copies," any addon it exposes should be assumed WebGL-only unless separately verified; it has not tracked three's newer TSL/WebGPU addon paths.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries). Recorded as `status: legacy` per the kb slug plan; the replacement is importing directly from `three/addons/*`.
