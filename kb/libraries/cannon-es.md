---
title: cannon-es
kind: library
slug: cannon-es
summary: Pure-JS physics engine with no release since 2022; keep it only for an existing project, and move new work to Rapier or Jolt.
tags: [cannon, cannon-es, physics, legacy, pure js]
applies_to: "<r186"
status: legacy
superseded_by: rapier
renderer: none
last_verified: 2026-09-26
sources: [https://github.com/pmndrs/cannon-es, ai-docs/research/2026-09-26-ecosystem-libraries.md, ai-docs/research/2026-09-26-games.md]
related: [rapier, jolt-physics, react-three-rapier]
package: "cannon-es"
version_checked: "0.20.0"
---

# cannon-es

## Use it for

- Maintaining an existing project already built on `cannon-es`, `@react-three/cannon` or `use-cannon`, where a physics-engine migration is not in scope for the current task.
- Very small, simple physics toys where the three.js manual's own description ("apparently no longer maintained") is an acceptable trade for a tiny pure-JS dependency with no WASM step.

## Avoid it when

- Starting anything new: last release 0.20.0 was 2022-08-12, over four years ago as of this entry, with only a documentation commit since (2024-01-06). Use `@dimforge/rapier3d-compat` (current, WASM, actively developed) or `jolt-physics` instead.
- The project needs a character controller, soft bodies, or any feature added to physics engines since 2022: cannon-es has none of that and will not receive it.

## Setup

Versions checked 2026-09-26: `cannon-es` 0.20.0, published 2022-08-12. `@react-three/cannon` 6.6.0 (2023-08-17) and `use-cannon` (last push 2024-02-25) are in the same state. The original `cannon` package (0.6.2, 2015) is fully dead; do not use it at all, even in legacy projects.

```js legacy
// Existing-project pattern only; do not start new work this way.
import * as CANNON from 'cannon-es';

const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
const body = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(0.5) });
world.addBody(body);
```

## Pitfalls

- No feature or security fixes since 2022; do not add it to a new project even for "just a quick physics toy" — Rapier's compat build is nearly as simple to set up and is actively maintained.
- `@react-three/cannon` and `use-cannon` inherit the same staleness; a React project should move to `@react-three/rapier` instead, not to a newer cannon wrapper (there is none).
- If migrating an existing cannon-es project, expect to rewrite body and shape construction: Rapier's API (colliders, rigid-body descriptors) is not a drop-in replacement for cannon's `Body`/`Shape` classes.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries, games). Recorded here as `status: legacy` per the kb slug plan; see `rapier` and `jolt-physics` for the current replacements.
