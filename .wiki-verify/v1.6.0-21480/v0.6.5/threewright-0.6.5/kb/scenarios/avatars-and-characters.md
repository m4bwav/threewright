---
title: Avatars and characters
slug: avatars-and-characters
kind: scenario
summary: VRM through three-vrm is the durable avatar path after Ready Player Me's shutdown; watch VRM 0.x's -Z forward convention and spring-bone jitter at variable dt.
tags: [avatars, vrm, three-vrm, ready player me, characters, mtoon, animation retargeting]
applies_to: ">=r167"
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-scenarios-xr-and-testing.md]
related: [three-vrm, model-viewer, games, animation-and-time, memory-and-disposal]
template: r3f
---

# Avatars and characters

## When

- A project needs a user-customizable or persona avatar rendered in three.js: VRM is the durable open path since Ready Player Me shut down (2026-01-31), Union Avatars closed (July 2026), and Spatial announced closure (July 2026).
- A game or app needs skinned characters with animation, expressions and physics-y hair or clothing (spring bones), authored in VRoid Studio, Avaturn, MetaPerson or similar.
- Not for a photoreal, non-anime character pipeline: MetaHuman (Unreal only) or Character Creator fit a different visual style, outside three.js entirely.

## Stack

- `@pixiv/three-vrm` for VRM 0.x and 1.0: humanoid bones, expressions (blend shapes), look-at, spring bones, and the MToon toon material. For `WebGPURenderer`, use `MToonNodeMaterial` via `MToonMaterialLoaderPlugin` (needs three r167 or later).
- Animation: retarget Mixamo FBX to VRM through the three-vrm examples, or use VRMA (VRM animation) files via `@pixiv/three-vrm-animation`.
- Still alive as authoring tools in 2026: VRoid Studio (free), Avaturn, MetaPerson (Avatar SDK), Genies (Unity), Character Creator.
- Either renderer works (`renderer: both`): MToon has a node-material path for WebGPU and a classic material path for WebGL.

## Build

- No dedicated avatar template exists yet. Start from `tw new r3f <dir>` for a React app or `tw new html-importmap <dir>` for vanilla, and add `@pixiv/three-vrm` from there.
- Load with `GLTFLoader` plus `VRMLoaderPlugin`; call `VRMUtils.rotateVRM0(vrm)` for VRM 0.x models, which face -Z by convention (VRM 1.0 faces +Z).
- Drive spring bones and any physics-y hair or clothing from a fixed or clamped delta, the same discipline as game physics; a variable `requestAnimationFrame` delta makes spring bones jitter visibly.
- For crowds or many skinned meshes per avatar (face, hair, clothing layers), merge where the source allows it and use texture atlases; many separate skinned meshes blow a draw-call budget fast.
- Do not build any pipeline step around a Ready Player Me URL or API; the hosted service is offline. Exported GLBs from before the shutdown still work locally.

## Pitfalls

- A VRM 0.x model loaded without the rotation fix faces backward relative to the camera; check `vrm.meta.metaVersion` (or just look at the model from the front) before assuming a facing bug is somewhere else.
- Spring-bone jitter at a variable frame delta is easy to mistake for a physics or rigging bug when the real cause is timing; fix the delta source first.
- Any tutorial or code sample referencing a Ready Player Me hosted avatar URL or its developer API is now describing a dead endpoint; do not port that pattern forward even if the surrounding code otherwise looks current.
- `MToonNodeMaterial`'s exact import path has moved as WebGPU support matured; check it against the installed `@pixiv/three-vrm` version rather than trusting an older snippet's import.

## Verify

- `tw check <page>` is `result: OK`; check the scene summary's draw-call count specifically after adding a crowd of avatars, since many skinned meshes per character adds up fast.
- `tw shot <page> --size 640x360` from the front to confirm facing direction (VRM 0.x rotation) and expression blend shapes look correct.
- `tw check <page> --reduced-motion` to confirm spring-bone motion (hair, clothing) does not itself violate a reduced-motion expectation if the avatar is part of a marketing or accessibility-sensitive page.

## Notes

- 2026-09-26: written from the 2026-09-26 research (scenarios-xr-and-testing A10). Avatar-platform closures (Ready Player Me, Union Avatars, Spatial) are recent and the list of "who's alive" is likely to keep changing; re-check before recommending any third-party avatar-creation service.
