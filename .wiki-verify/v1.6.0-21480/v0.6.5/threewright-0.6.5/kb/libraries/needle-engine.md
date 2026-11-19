---
title: Needle Engine
kind: library
slug: needle-engine
summary: Unity- and Blender-to-web runtime built on a three.js fork, with built-in physics, networking and XR; install the stable dist-tag, not latest.
tags: [needle, unity, blender, runtime, xr, networking, gltf-progressive]
applies_to: ">=r159"
status: current
renderer: both
last_verified: 2026-09-26
sources: [https://engine.needle.tools/docs/, https://www.npmjs.com/package/@needle-tools/engine, ai-docs/research/2026-09-26-ecosystem-libraries.md, ai-docs/research/2026-09-26-games.md]
related: [games, iwsdk]
package: "@needle-tools/engine"
version_checked: "5.1.13"
---

# Needle Engine

## Use it for

- Shipping content authored in Unity or Blender to the web with component-based authoring, when the team already works in those tools.
- Projects that want built-in physics, networking and WebXR out of the box instead of assembling three.js, Rapier and a networking library separately.
- iOS AR through App Clips, and progressive glTF LOD streaming via `@needle-tools/gltf-progressive`.

## Avoid it when

- The project needs stock, unmodified three.js or an OSS license for the runtime: Needle bundles its own three.js fork (`@needle-tools/three`) and its LICENSE.md says "not open source"; free for non-commercial use, commercial use needs an eligible plan (unverified pricing details beyond that).
- You cannot pin dependencies carefully: `npm i @needle-tools/engine` installs whatever `latest` points to, which on 2026-09-26 is the 6.0.0-alpha.3 line on a newer (still older-than-current) three fork, not the stable 5.1.13 line.

## Setup

Versions checked 2026-09-26: dist-tag `stable` is 5.1.13 (2026-09-09, bundles `@needle-tools/three` 0.169.19); dist-tag `latest` is 6.0.0-alpha.3 (2026-08-13, bundles `@needle-tools/three` 0.185.2-alpha.1). Both are forks of three, several releases behind the plain `three` package (0.186.1).

```sh
npm install @needle-tools/engine@stable   # 5.1.13; do not use the bare package name, it resolves to the 6.0 alpha
```

Needle ships a `SKILL.md` (about 494 lines) inside its npm tarball for agent tooling; read that file directly from `node_modules/@needle-tools/engine` rather than re-deriving Needle-specific workflow from scratch.

## Pitfalls

- The npm `latest` tag is a 6.0 alpha, not the stable release; always pin `@stable` or an exact 5.1.13-line version unless you specifically want the alpha's WebGPU and Gaussian-splat (Spark-based) preview features.
- Needle's bundled three fork is not interchangeable with a separately installed `three` package; do not mix imports from `three` and from Needle's internal three in the same scene.
- Licensing terms for commercial use are vendor-stated and were not independently re-verified past the README and pricing page summary; check current terms before shipping a commercial product on it.
- Because it targets Unity/Blender export pipelines, debugging a Needle scene often means checking the exported glTF's `extras` and custom components rather than three.js scene-graph code directly.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries, games).
