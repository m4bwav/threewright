---
title: three-vrm
kind: library
slug: three-vrm
summary: The durable open avatar path for three.js after Ready Player Me's shutdown; VRM 0.x and 1.0 support, MToon material, and a WebGPU node-material path.
tags: [vrm, avatar, pixiv, mtoon, humanoid, spring bones, blend shapes]
applies_to: ">=r167"
status: current
renderer: both
last_verified: 2026-09-26
sources: [https://github.com/pixiv/three-vrm, ai-docs/research/2026-09-26-ecosystem-libraries.md, ai-docs/research/2026-09-26-scenarios-xr-and-testing.md]
related: [avatars-and-characters, model-viewer]
package: "@pixiv/three-vrm"
version_checked: "3.5.5"
---

# three-vrm

## Use it for

- Any VRM avatar (0.x or 1.0) in three.js: humanoid bones, blend-shape expressions, look-at, spring bones, and the MToon toon material.
- The durable avatar path now that Ready Player Me shut down (2026-01-31) and Union Avatars and Spatial closed too: exported VRM files keep working locally, unlike hosted avatar URLs.
- WebGPU scenes, through `MToonNodeMaterial` via `MToonMaterialLoaderPlugin` (needs three r167 or later).
- Animation retargeting from Mixamo FBX, and VRMA (VRM animation) files through `@pixiv/three-vrm-animation`.

## Avoid it when

- The project needs a non-anime, photoreal avatar pipeline: VRM and MToon are built around the VRoid/anime style; MetaHuman (Unreal-only) or Character Creator fit a different look, outside three.js entirely.
- Any code still depends on a Ready Player Me hosted avatar URL: those endpoints are gone; migrate to locally hosted VRM/GLB files regardless of which renderer you use.

## Setup

Versions checked 2026-09-26: `@pixiv/three-vrm` 3.5.5 (2026-07-09), peer `three >=0.137`. `@pixiv/three-vrm-animation` 3.6.0-beta.0 sits on the `next` dist-tag (2026-09-25); stay on the stable line unless you need its fixes.

```sh
npm install @pixiv/three-vrm@3.5.5
```

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));

const gltf = await loader.loadAsync('avatar.vrm');
const vrm = gltf.userData.vrm;
VRMUtils.rotateVRM0(vrm); // VRM 0.x models face -Z; rotate 180 degrees for VRM 1.0 forward convention
scene.add(vrm.scene);
```

WebGPU: swap the material plugin for `MToonMaterialLoaderPlugin` from the WebGPU-aware entry point (check the current import path against the installed package version; it changed as the node-material support matured).

## Pitfalls

- VRM 0.x models face -Z by convention while VRM 1.0 faces +Z; call `VRMUtils.rotateVRM0(vrm)` (or check the model's `metaVersion`) or the avatar loads facing backward relative to the camera.
- Spring bones jitter at a variable frame delta; drive the VRM's spring-bone update from a fixed or clamped delta, the same discipline as physics, not from raw `requestAnimationFrame` timing.
- Many skinned meshes per avatar (face, hair, clothing layers) can blow a draw-call budget fast; merge where the source allows it and use texture atlases, especially for crowds.
- Do not build a pipeline around a Ready Player Me URL or API; the service is offline. Any tutorial referencing it is now describing a dead endpoint.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries, scenarios-xr-and-testing).
